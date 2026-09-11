import { describe, expect, it } from 'vitest'
import { deriveGradeFromAttempt, scheduleConceptReview } from './conceptSrs'
import { initialSrsState } from './srs'
import type { QuestionAttempt } from '../types'

function makeAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    id: '1',
    questionId: 'q1',
    conceptId: 'c1',
    topicId: 't1',
    courseId: 'course1',
    difficulty: 2,
    timestamp: Date.now(),
    studentAnswer: 'x',
    correctness: 'correct',
    score: 90,
    feedback: { whatWasCorrect: '', whatWasMissing: '', whatWasWrong: '', improvementTip: '' },
    hintsUsed: 0,
    responseTimeMs: 4000,
    gradedBy: 'ai',
    source: 'practice',
    ...overrides,
  }
}

describe('deriveGradeFromAttempt', () => {
  it('maps incorrect to again', () => {
    expect(deriveGradeFromAttempt(makeAttempt({ correctness: 'incorrect' }))).toBe('again')
  })
  it('maps partial to hard', () => {
    expect(deriveGradeFromAttempt(makeAttempt({ correctness: 'partial' }))).toBe('hard')
  })
  it('maps a correct answer that needed hints to hard, not easy', () => {
    expect(deriveGradeFromAttempt(makeAttempt({ correctness: 'correct', hintsUsed: 1 }))).toBe('hard')
  })
  it('maps a confident, hint-free correct answer to easy', () => {
    expect(deriveGradeFromAttempt(makeAttempt({ correctness: 'correct', confidence: 'high', hintsUsed: 0 }))).toBe('easy')
  })
  it('maps a low-confidence correct answer to good, not easy', () => {
    expect(deriveGradeFromAttempt(makeAttempt({ correctness: 'correct', confidence: 'low', hintsUsed: 0 }))).toBe('good')
  })
})

describe('scheduleConceptReview', () => {
  it('pushes the due date forward on a correct answer', () => {
    const now = Date.now()
    const next = scheduleConceptReview(initialSrsState(), makeAttempt({ correctness: 'correct' }), now)
    expect(next.dueAt).toBeGreaterThan(now)
  })

  it('brings a wrong answer back soon rather than far in the future', () => {
    const now = Date.now()
    const next = scheduleConceptReview(initialSrsState(), makeAttempt({ correctness: 'incorrect' }), now)
    expect(next.dueAt - now).toBeLessThan(24 * 60 * 60 * 1000)
    expect(next.lapses).toBe(1)
  })
})
