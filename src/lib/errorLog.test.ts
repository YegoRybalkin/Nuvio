import { describe, expect, it } from 'vitest'
import { categorizeError, createErrorRecord, shouldLogError } from './errorLog'
import { makeQuestion } from './testFixtures'
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
    studentAnswer: 'my answer',
    correctness: 'incorrect',
    score: 0,
    feedback: { whatWasCorrect: '', whatWasMissing: '', whatWasWrong: '', improvementTip: '' },
    hintsUsed: 0,
    responseTimeMs: 8000,
    gradedBy: 'ai',
    source: 'practice',
    ...overrides,
  }
}

describe('shouldLogError', () => {
  it('logs incorrect and partial attempts but not correct ones', () => {
    expect(shouldLogError(makeAttempt({ correctness: 'incorrect' }))).toBe(true)
    expect(shouldLogError(makeAttempt({ correctness: 'partial' }))).toBe(true)
    expect(shouldLogError(makeAttempt({ correctness: 'correct' }))).toBe(false)
  })
})

describe('categorizeError', () => {
  it('categorizes a blank answer as forgotten', () => {
    const question = makeQuestion()
    expect(categorizeError(question, makeAttempt({ studentAnswer: '' }))).toBe('forgotten')
  })

  it('categorizes a very fast wrong answer as careless', () => {
    const question = makeQuestion()
    expect(categorizeError(question, makeAttempt({ responseTimeMs: 1200 }))).toBe('careless')
  })

  it('categorizes a calculation question miss as a calculation error', () => {
    const question = makeQuestion({ type: 'calculation' })
    expect(categorizeError(question, makeAttempt({ responseTimeMs: 9000 }))).toBe('calculation')
  })

  it('categorizes an identify_method miss as formula selection', () => {
    const question = makeQuestion({ type: 'identify_method' })
    expect(categorizeError(question, makeAttempt({ responseTimeMs: 9000 }))).toBe('formula_selection')
  })

  it('defers to an AI-detected misconception when present', () => {
    const question = makeQuestion({ type: 'calculation' })
    expect(categorizeError(question, makeAttempt({ responseTimeMs: 9000, misconceptionTag: 'confuses mean and median' }))).toBe(
      'conceptual',
    )
  })
})

describe('createErrorRecord', () => {
  it('links back to the attempt, question, and concept, starting uncorrected', () => {
    const question = makeQuestion({ conceptId: 'concept-42' })
    const attempt = makeAttempt({ id: 'attempt-1' })
    const record = createErrorRecord(question, attempt)
    expect(record.attemptId).toBe('attempt-1')
    expect(record.questionId).toBe(question.id)
    expect(record.conceptId).toBe('concept-42')
    expect(record.corrected).toBe(false)
  })
})
