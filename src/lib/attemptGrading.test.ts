import { describe, expect, it } from 'vitest'
import { gradeAttempt } from './attemptGrading'
import { makeQuestion } from './testFixtures'

const ctx = { hintsUsed: 0, responseTimeMs: 3000, source: 'practice' as const }

describe('gradeAttempt - mcq', () => {
  it('grades the correct choice as correct with full score', async () => {
    const question = makeQuestion({ type: 'mcq', choices: ['a', 'b', 'c', 'd'], correctIndex: 2 })
    const result = await gradeAttempt(question, '2', ctx)
    expect(result.correctness).toBe('correct')
    expect(result.score).toBe(100)
    expect(result.gradedBy).toBe('mcq')
  })

  it('grades a wrong choice as incorrect with zero score', async () => {
    const question = makeQuestion({ type: 'mcq', choices: ['a', 'b', 'c', 'd'], correctIndex: 2 })
    const result = await gradeAttempt(question, '0', ctx)
    expect(result.correctness).toBe('incorrect')
    expect(result.score).toBe(0)
  })
})

describe('gradeAttempt - calculation (deterministic)', () => {
  it('accepts an answer within tolerance as correct', async () => {
    const question = makeQuestion({ type: 'calculation', numericAnswer: 100, tolerance: 0.02 })
    const result = await gradeAttempt(question, '100.5', ctx)
    expect(result.correctness).toBe('correct')
    expect(result.gradedBy).toBe('deterministic')
  })

  it('rejects a wildly wrong number as incorrect', async () => {
    const question = makeQuestion({ type: 'calculation', numericAnswer: 100, tolerance: 0.02 })
    const result = await gradeAttempt(question, '9', ctx)
    expect(result.correctness).toBe('incorrect')
  })

  it('marks a moderately-off answer as partial rather than wrong or right', async () => {
    const question = makeQuestion({ type: 'calculation', numericAnswer: 100, tolerance: 0.02 })
    // 8% off: outside the 2% tolerance but inside the 5x (10%) partial band.
    const result = await gradeAttempt(question, '108', ctx)
    expect(result.correctness).toBe('partial')
  })

  it('parses numbers with commas and currency symbols', async () => {
    const question = makeQuestion({ type: 'calculation', numericAnswer: 1240, tolerance: 0.02 })
    const result = await gradeAttempt(question, '$1,240.00', ctx)
    expect(result.correctness).toBe('correct')
  })

  it('falls back to reasoning-based grading when no number is present', async () => {
    const question = makeQuestion({ type: 'calculation', numericAnswer: 100, rubric: ['uses the formula'] })
    const result = await gradeAttempt(question, 'I would use the formula to solve this.', ctx)
    expect(result.gradedBy).not.toBe('deterministic')
  })
})

describe('gradeAttempt - open-ended without an API key', () => {
  it('falls back to heuristic keyword grading and never claims to be AI-graded', async () => {
    const question = makeQuestion({ type: 'short_answer', rubric: ['mentions supply and demand'] })
    const result = await gradeAttempt(question, 'This is about supply and demand shifting.', ctx)
    expect(result.gradedBy).toBe('heuristic')
    expect(result.score).toBeGreaterThan(0)
  })

  it('scores a blank answer as incorrect', async () => {
    const question = makeQuestion({ type: 'short_answer', rubric: ['mentions supply and demand'] })
    const result = await gradeAttempt(question, '', ctx)
    expect(result.correctness).toBe('incorrect')
  })
})
