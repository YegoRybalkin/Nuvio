import { describe, expect, it } from 'vitest'
import { bandFromScore, calibrationFlag, computeMastery } from './mastery'
import type { QuestionAttempt } from '../types'

function makeAttempt(overrides: Partial<QuestionAttempt> = {}): QuestionAttempt {
  return {
    id: crypto.randomUUID(),
    questionId: 'q1',
    conceptId: 'c1',
    topicId: 't1',
    courseId: 'course1',
    difficulty: 2,
    timestamp: Date.now(),
    studentAnswer: 'answer',
    correctness: 'correct',
    score: 90,
    feedback: { whatWasCorrect: '', whatWasMissing: '', whatWasWrong: '', improvementTip: '' },
    hintsUsed: 0,
    responseTimeMs: 5000,
    gradedBy: 'ai',
    source: 'practice',
    ...overrides,
  }
}

describe('bandFromScore', () => {
  it('maps score ranges to the right band', () => {
    expect(bandFromScore(10)).toBe('weak')
    expect(bandFromScore(45)).toBe('developing')
    expect(bandFromScore(70)).toBe('good')
    expect(bandFromScore(95)).toBe('mastered')
  })
})

describe('computeMastery', () => {
  it('returns a weak, zero-attempt state for a concept with no history', () => {
    const result = computeMastery('c1', 'course1', [])
    expect(result.attemptsCount).toBe(0)
    expect(result.score).toBe(0)
    expect(result.band).toBe('weak')
  })

  it('never lets a single correct answer read as mastered', () => {
    const attempts = [makeAttempt({ score: 100, correctness: 'correct' })]
    const result = computeMastery('c1', 'course1', attempts)
    expect(result.score).toBeLessThanOrEqual(70)
    expect(result.band).not.toBe('mastered')
  })

  it('caps score below mastered when all attempts happen in one short session', () => {
    const now = Date.now()
    const attempts = Array.from({ length: 4 }, (_, i) =>
      makeAttempt({ score: 100, correctness: 'correct', timestamp: now + i * 1000 }),
    )
    const result = computeMastery('c1', 'course1', attempts)
    expect(result.score).toBeLessThanOrEqual(85)
  })

  it('reaches mastered only with consistent success spaced over time', () => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const attempts = Array.from({ length: 6 }, (_, i) =>
      makeAttempt({ score: 95, correctness: 'correct', difficulty: 3, timestamp: now - (5 - i) * day }),
    )
    const result = computeMastery('c1', 'course1', attempts)
    expect(result.band).toBe('mastered')
  })

  it('only considers attempts for the requested concept', () => {
    const attempts = [
      makeAttempt({ conceptId: 'c1', score: 90 }),
      makeAttempt({ conceptId: 'c2', score: 10, correctness: 'incorrect' }),
    ]
    const result = computeMastery('c1', 'course1', attempts)
    expect(result.attemptsCount).toBe(1)
  })

  it('weighs a high-confidence wrong answer worse than a low-confidence wrong answer', () => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const base = Array.from({ length: 4 }, (_, i) =>
      makeAttempt({ score: 90, correctness: 'correct', timestamp: now - (10 - i) * day }),
    )
    const overconfidentMiss = [...base, makeAttempt({ score: 0, correctness: 'incorrect', confidence: 'high', timestamp: now })]
    const shakyMiss = [...base, makeAttempt({ score: 0, correctness: 'incorrect', confidence: 'low', timestamp: now })]
    const overconfidentResult = computeMastery('c1', 'course1', overconfidentMiss)
    const shakyResult = computeMastery('c1', 'course1', shakyMiss)
    expect(overconfidentResult.score).toBeLessThanOrEqual(shakyResult.score)
  })

  it('tracks a trailing correct streak and resets it on a miss', () => {
    const attempts = [
      makeAttempt({ correctness: 'incorrect', score: 0 }),
      makeAttempt({ correctness: 'correct', score: 90 }),
      makeAttempt({ correctness: 'correct', score: 90 }),
    ]
    const result = computeMastery('c1', 'course1', attempts)
    expect(result.correctStreak).toBe(2)
  })
})

describe('calibrationFlag', () => {
  it('flags high confidence + wrong as overconfident', () => {
    expect(calibrationFlag(makeAttempt({ confidence: 'high', correctness: 'incorrect' }))).toBe('overconfident')
  })
  it('flags low confidence + correct as underconfident', () => {
    expect(calibrationFlag(makeAttempt({ confidence: 'low', correctness: 'correct' }))).toBe('underconfident')
  })
  it('returns null for well-calibrated attempts', () => {
    expect(calibrationFlag(makeAttempt({ confidence: 'high', correctness: 'correct' }))).toBeNull()
  })
})
