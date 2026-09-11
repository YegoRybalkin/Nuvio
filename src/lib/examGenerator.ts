import type { Exam, MasteryState, Question } from '../types'

const SECONDS_PER_EXAM_QUESTION = 150

/** Builds a mock exam question set from the existing question bank: covers
 * every topic the exam names, skews toward higher difficulty and toward
 * weaker/due concepts (cumulative, mixed testing rather than easy review),
 * sized to roughly fit the exam's duration. Draws from the bank rather than
 * generating fresh questions so it's instant and free every time; concepts
 * with several questions available surface their harder ones first. */
export function generateMockExam(exam: Exam, questions: Question[], masteryStates: MasteryState[]): Question[] {
  const scoreByConcept = new Map(masteryStates.map((m) => [m.conceptId, m.score]))
  const pool = questions.filter((q) => exam.topicIds.includes(q.topicId))
  if (pool.length === 0) return []

  const targetCount = Math.max(6, Math.min(pool.length, Math.round((exam.durationMin * 60) / SECONDS_PER_EXAM_QUESTION)))

  const weighted = pool
    .map((q) => {
      const mastery = scoreByConcept.get(q.conceptId) ?? 30
      // Lower mastery and higher difficulty both raise selection priority.
      const priority = (100 - mastery) + q.difficulty * 10 + Math.random() * 20
      return { q, priority }
    })
    .sort((a, b) => b.priority - a.priority)

  // Guarantee at least one question per topic before filling with the
  // highest-priority remainder, so coverage is cumulative across the exam
  // rather than accidentally concentrated on one topic.
  const chosen: Question[] = []
  const chosenIds = new Set<string>()
  for (const topicId of exam.topicIds) {
    const first = weighted.find((w) => w.q.topicId === topicId && !chosenIds.has(w.q.id))
    if (first) {
      chosen.push(first.q)
      chosenIds.add(first.q.id)
    }
  }
  for (const { q } of weighted) {
    if (chosen.length >= targetCount) break
    if (chosenIds.has(q.id)) continue
    chosen.push(q)
    chosenIds.add(q.id)
  }

  // Shuffle so topics interleave rather than running topic-by-topic.
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chosen[i], chosen[j]] = [chosen[j], chosen[i]]
  }
  return chosen
}
