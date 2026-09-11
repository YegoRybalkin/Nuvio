import { describe, expect, it } from 'vitest'
import { generateSessionPlan } from './sessionGenerator'
import { isDue } from './srs'
import { makeConcept, makeMasteryState, makeQuestion } from './testFixtures'

function buildScenario() {
  const weakConcept = makeConcept({ id: 'weak', name: 'Weak Concept' })
  const strongConcept = makeConcept({ id: 'strong', name: 'Strong Concept' })
  const dueConcept = makeConcept({ id: 'due', name: 'Due Concept' })

  const questions = [
    ...Array.from({ length: 3 }, (_, i) => makeQuestion({ conceptId: 'weak', difficulty: (1 + (i % 3)) as 1 | 2 | 3 })),
    ...Array.from({ length: 3 }, (_, i) => makeQuestion({ conceptId: 'strong', difficulty: (3 + (i % 3)) as 3 | 4 | 5, type: 'scenario' })),
    ...Array.from({ length: 3 }, (_, i) => makeQuestion({ conceptId: 'due', difficulty: (1 + (i % 3)) as 1 | 2 | 3 })),
  ]

  const overdueSrs = { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueAt: Date.now() - 1000, lastGrade: 'good' as const, lapses: 0 }
  const futureSrs = { repetitions: 2, easeFactor: 2.5, intervalDays: 10, dueAt: Date.now() + 100000000, lastGrade: 'easy' as const, lapses: 0 }

  const masteryStates = [
    makeMasteryState({ conceptId: 'weak', band: 'weak', score: 20, srs: futureSrs }),
    makeMasteryState({ conceptId: 'strong', band: 'mastered', score: 90, srs: futureSrs }),
    makeMasteryState({ conceptId: 'due', band: 'good', score: 70, srs: overdueSrs }),
  ]

  return {
    concepts: [weakConcept, strongConcept, dueConcept],
    questions,
    masteryStates,
    errors: [],
    exams: [],
  }
}

describe('generateSessionPlan', () => {
  it('produces segments that only reference questions from the given pool', () => {
    const data = buildScenario()
    const plan = generateSessionPlan(30, data)
    const poolIds = new Set(data.questions.map((q) => q.id))
    for (const segment of plan) {
      for (const id of segment.questionIds) expect(poolIds.has(id)).toBe(true)
    }
  })

  it('never assigns the same question to two segments', () => {
    const data = buildScenario()
    const plan = generateSessionPlan(45, data)
    const seen = new Set<string>()
    for (const segment of plan) {
      for (const id of segment.questionIds) {
        expect(seen.has(id)).toBe(false)
        seen.add(id)
      }
    }
  })

  it('includes the due concept in the spaced_review segment when one exists', () => {
    const data = buildScenario()
    expect(data.masteryStates.some((m) => isDue(m.srs))).toBe(true)
    const plan = generateSessionPlan(45, data)
    const reviewSegment = plan.find((s) => s.purpose === 'spaced_review')
    expect(reviewSegment).toBeDefined()
    const reviewConceptIds = reviewSegment!.questionIds.map((id) => data.questions.find((q) => q.id === id)?.conceptId)
    expect(reviewConceptIds).toContain('due')
  })

  it('produces more total questions for a longer session', () => {
    const data = buildScenario()
    const shortPlan = generateSessionPlan(15, data)
    const longPlan = generateSessionPlan(60, data)
    const count = (plan: typeof shortPlan) => plan.reduce((sum, s) => sum + s.questionIds.length, 0)
    expect(count(longPlan)).toBeGreaterThanOrEqual(count(shortPlan))
  })

  it('falls back to something rather than an empty plan when a pool exists', () => {
    const data = buildScenario()
    const plan = generateSessionPlan(5, data)
    expect(plan.length).toBeGreaterThan(0)
  })
})
