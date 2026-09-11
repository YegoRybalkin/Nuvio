// No-API-key fallback for course analysis. Produces the same shape as the AI
// analysis (courseAi.ts) so downstream ingestion code doesn't need to know
// which path built it, but is honest about its limits: it cannot reliably
// invent numeric calculation problems from arbitrary prose, so quantitative
// subjects get materially better results with an API key configured.
import {
  buildFrequencyMap,
  extractDefinitions,
  extractKeyTerms,
  normalizeSpacing,
  splitSentences,
} from './nlp'
import type { CourseAnalysis } from './courseAi'
import type { Importance } from '../types'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickDistractors<T>(pool: T[], exclude: T, count: number): T[] {
  return shuffle(pool.filter((p) => p !== exclude)).slice(0, count)
}

export function analyzeCourseMaterialHeuristically(rawText: string): CourseAnalysis {
  const sentences = splitSentences(rawText)
  const freq = buildFrequencyMap(sentences)
  const keyTerms = extractKeyTerms(sentences, freq, 30)
  const definitions = extractDefinitions(sentences)

  const covered = new Set<string>()
  const concepts: CourseAnalysis['topics'][number]['concepts'] = []

  const rank = (index: number, total: number): Importance => {
    if (total <= 1) return 'core'
    const pct = index / total
    if (pct < 0.35) return 'core'
    if (pct < 0.7) return 'supporting'
    return 'minor'
  }

  for (const def of definitions) {
    const key = def.term.toLowerCase()
    if (covered.has(key)) continue
    covered.add(key)
    concepts.push({
      name: def.term,
      definition: def.definition,
      learningObjective: `Recall and explain ${def.term} in your own words.`,
      examples: [],
      misconceptions: [],
      importance: rank(concepts.length, definitions.length + keyTerms.length),
    })
  }

  for (const kt of keyTerms) {
    const key = kt.term.toLowerCase()
    if (covered.has(key)) continue
    const sentence = sentences[kt.sentenceIndex]
    if (!sentence) continue
    covered.add(key)
    concepts.push({
      name: kt.term,
      definition: normalizeSpacing(sentence.text),
      learningObjective: `Recall what ${kt.term} refers to and where it appears in the material.`,
      examples: [],
      misconceptions: [],
      importance: rank(concepts.length, definitions.length + keyTerms.length),
    })
    if (concepts.length >= 24) break
  }

  const questions: CourseAnalysis['questions'] = []

  for (const concept of concepts) {
    questions.push({
      conceptName: concept.name,
      type: 'definition',
      difficulty: 1,
      prompt: `What is ${concept.name}?`,
      correctAnswer: concept.definition,
      rubric: [concept.definition],
      explanation: concept.definition,
    })
    questions.push({
      conceptName: concept.name,
      type: 'short_answer',
      difficulty: 2,
      prompt: `In your own words, explain ${concept.name} and why it matters.`,
      correctAnswer: concept.definition,
      rubric: [concept.definition],
      explanation: concept.definition,
    })

    const distractors = pickDistractors(
      concepts.map((c) => c.definition),
      concept.definition,
      3,
    )
    if (distractors.length === 3) {
      const choices = shuffle([concept.definition, ...distractors])
      questions.push({
        conceptName: concept.name,
        type: 'mcq',
        difficulty: 2,
        prompt: `Which of the following best describes "${concept.name}"?`,
        choices,
        correctIndex: choices.indexOf(concept.definition),
        correctAnswer: concept.definition,
        rubric: [concept.definition],
        explanation: `${concept.name}: ${concept.definition}`,
      })
    }
  }

  return {
    topics: [
      {
        name: 'Key Concepts',
        importance: 'core',
        concepts,
      },
    ],
    questions,
  }
}
