import { describe, expect, it } from 'vitest'
import { generateMockExam } from './examGenerator'
import { makeMasteryState, makeQuestion } from './testFixtures'
import type { Exam } from '../types'

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: 'exam1',
    courseId: 'course1',
    name: 'Test Exam',
    date: Date.now() + 86400000,
    topicIds: ['topic1', 'topic2'],
    format: 'Mixed',
    durationMin: 60,
    ...overrides,
  }
}

describe('generateMockExam', () => {
  it('returns nothing when no questions match the exam topics', () => {
    const exam = makeExam({ topicIds: ['nonexistent'] })
    const questions = [makeQuestion({ topicId: 'topic1' })]
    expect(generateMockExam(exam, questions, [])).toHaveLength(0)
  })

  it('includes at least one question per exam topic when available', () => {
    const exam = makeExam({ topicIds: ['topic1', 'topic2'], durationMin: 90 })
    const questions = [
      ...Array.from({ length: 5 }, () => makeQuestion({ topicId: 'topic1' })),
      ...Array.from({ length: 5 }, () => makeQuestion({ topicId: 'topic2' })),
    ]
    const result = generateMockExam(exam, questions, [])
    const topicsCovered = new Set(result.map((q) => q.topicId))
    expect(topicsCovered.has('topic1')).toBe(true)
    expect(topicsCovered.has('topic2')).toBe(true)
  })

  it('never duplicates a question', () => {
    const exam = makeExam({ durationMin: 120 })
    const questions = Array.from({ length: 8 }, () => makeQuestion({ topicId: 'topic1' }))
    const result = generateMockExam(exam, questions, [])
    const ids = result.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('scales roughly with exam duration, capped by pool size', () => {
    const questions = Array.from({ length: 40 }, () => makeQuestion({ topicId: 'topic1' }))
    const shortExam = makeExam({ durationMin: 30, topicIds: ['topic1'] })
    const longExam = makeExam({ durationMin: 120, topicIds: ['topic1'] })
    const shortResult = generateMockExam(shortExam, questions, [])
    const longResult = generateMockExam(longExam, questions, [])
    expect(longResult.length).toBeGreaterThan(shortResult.length)
  })

  it('prioritizes lower-mastery concepts over already-mastered ones', () => {
    const weakQuestion = makeQuestion({ id: 'weak-q', conceptId: 'weak-concept', topicId: 'topic1' })
    const masteredQuestions = Array.from({ length: 10 }, (_, i) =>
      makeQuestion({ id: `mastered-q-${i}`, conceptId: 'mastered-concept', topicId: 'topic1' }),
    )
    const exam = makeExam({ topicIds: ['topic1'], durationMin: 15 })
    const masteryStates = [
      makeMasteryState({ conceptId: 'weak-concept', score: 10 }),
      makeMasteryState({ conceptId: 'mastered-concept', score: 95 }),
    ]
    let weakIncluded = 0
    for (let i = 0; i < 20; i++) {
      const result = generateMockExam(exam, [weakQuestion, ...masteredQuestions], masteryStates)
      if (result.some((q) => q.id === 'weak-q')) weakIncluded++
    }
    // The weak concept's only question should be selected far more often than
    // its 1-in-11 share of the pool would predict by chance.
    expect(weakIncluded).toBeGreaterThan(10)
  })
})
