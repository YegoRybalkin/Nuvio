export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  repetitions: number
  easeFactor: number
  intervalDays: number
  dueAt: number
  lastGrade: Grade | null
  lapses: number
}

export interface Flashcard {
  id: string
  front: string
  back: string
  cloze: boolean
  srs: SrsState
}

export type QuizQuestionType = 'mcq' | 'truefalse'

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  prompt: string
  choices: string[]
  correctIndex: number
  explanation: string
}

export interface QuizAttempt {
  completedAt: number
  score: number
  total: number
}

export interface StudySet {
  id: string
  title: string
  createdAt: number
  sourceFileName?: string
  sourceWordCount: number
  summary: string[]
  terms: string[]
  flashcards: Flashcard[]
  quiz: QuizQuestion[]
  quizAttempts: QuizAttempt[]
}
