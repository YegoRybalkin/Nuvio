// Shared fixture builders for unit tests only.
import { initialSrsState } from './srs'
import type { Concept, DifficultyLevel, MasteryState, Question, QuestionType } from '../types'

let counter = 0
function nextId(prefix: string) {
  counter += 1
  return `${prefix}-${counter}`
}

export function makeConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    id: nextId('concept'),
    courseId: 'course1',
    topicId: 'topic1',
    name: 'Test Concept',
    definition: 'A concept used for testing.',
    learningObjective: 'Understand the test concept.',
    examples: [],
    misconceptions: [],
    sourceRefs: [],
    importance: 'core',
    ...overrides,
  }
}

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: nextId('question'),
    courseId: 'course1',
    topicId: 'topic1',
    conceptId: 'concept1',
    type: 'short_answer' as QuestionType,
    difficulty: 2 as DifficultyLevel,
    prompt: 'Test prompt?',
    correctAnswer: 'Test answer',
    rubric: ['key point'],
    explanation: 'Because.',
    sourceRefs: [],
    createdAt: Date.now(),
    ...overrides,
  }
}

export function makeMasteryState(overrides: Partial<MasteryState> = {}): MasteryState {
  return {
    conceptId: 'concept1',
    courseId: 'course1',
    score: 50,
    band: 'developing',
    attemptsCount: 2,
    correctStreak: 0,
    lastAttemptAt: Date.now(),
    srs: initialSrsState(),
    ...overrides,
  }
}
