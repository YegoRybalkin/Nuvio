import type { CourseAnalysis } from './courseAi'
import { tokenize } from './nlp'
import type { Concept, Question, SourceChunk, SourceRef, Topic } from '../types'

const uid = () => crypto.randomUUID()

function bestChunkRef(chunks: SourceChunk[], text: string): SourceRef | undefined {
  if (chunks.length === 0) return undefined
  const queryTokens = new Set(tokenize(text))
  if (queryTokens.size === 0) return undefined

  let best: SourceChunk | undefined
  let bestScore = 0
  for (const chunk of chunks) {
    const chunkTokens = tokenize(chunk.text)
    let overlap = 0
    for (const t of chunkTokens) if (queryTokens.has(t)) overlap++
    const score = overlap / Math.sqrt(chunkTokens.length + 1)
    if (score > bestScore) {
      bestScore = score
      best = chunk
    }
  }
  if (!best || bestScore === 0) return undefined
  return { materialId: best.materialId, chunkId: best.id, excerpt: best.text.slice(0, 220) }
}

export interface MaterializedAnalysis {
  topics: Topic[]
  concepts: Concept[]
  questions: Question[]
  skippedQuestions: number
}

/** Turns an AI or heuristic CourseAnalysis into concrete, ID-linked records
 * ready to merge into the store, resolving each question's conceptName back
 * to a concrete concept and attaching a best-effort source reference so
 * generated content can be traced back to the material it came from. */
export function materializeAnalysis(
  courseId: string,
  analysis: CourseAnalysis,
  chunks: SourceChunk[],
): MaterializedAnalysis {
  const topics: Topic[] = []
  const concepts: Concept[] = []
  const conceptIdByName = new Map<string, { id: string; topicId: string }>()

  for (const t of analysis.topics) {
    const topicId = uid()
    const conceptIds: string[] = []

    for (const c of t.concepts) {
      const conceptId = uid()
      const sourceRef = bestChunkRef(chunks, `${c.name} ${c.definition}`)
      concepts.push({
        id: conceptId,
        courseId,
        topicId,
        name: c.name,
        definition: c.definition,
        learningObjective: c.learningObjective,
        formula: c.formula,
        examples: c.examples,
        misconceptions: c.misconceptions,
        sourceRefs: sourceRef ? [sourceRef] : [],
        importance: c.importance,
      })
      conceptIds.push(conceptId)
      conceptIdByName.set(c.name.trim().toLowerCase(), { id: conceptId, topicId })
    }

    topics.push({ id: topicId, courseId, name: t.name, importance: t.importance, conceptIds })
  }

  const questions: Question[] = []
  let skipped = 0

  for (const q of analysis.questions) {
    const match = conceptIdByName.get(q.conceptName.trim().toLowerCase())
    if (!match) {
      skipped++
      continue
    }
    const sourceRef = bestChunkRef(chunks, q.prompt)
    questions.push({
      id: uid(),
      courseId,
      topicId: match.topicId,
      conceptId: match.id,
      type: q.type,
      difficulty: q.difficulty,
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
      correctAnswer: q.correctAnswer,
      numericAnswer: q.numericAnswer,
      tolerance: q.numericAnswer !== undefined ? 0.02 : undefined,
      rubric: q.rubric,
      explanation: q.explanation,
      sourceRefs: sourceRef ? [sourceRef] : [],
      createdAt: Date.now(),
    })
  }

  return { topics, concepts, questions, skippedQuestions: skipped }
}
