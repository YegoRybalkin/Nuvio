export type Grade = 'again' | 'hard' | 'good' | 'easy'

export type Importance = 'core' | 'supporting' | 'minor'

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
  importance?: Importance
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
  importance?: Importance
}

export interface QuizAttempt {
  completedAt: number
  score: number
  total: number
}

export interface MatchAttempt {
  completedAt: number
  pairs: number
  seconds: number
  mistakes: number
}

export interface Concept {
  name: string
  explanation: string
  whyItMatters: string
  shortDefinition?: string
  importance?: Importance
}

export type GenerationMode = 'ai' | 'heuristic'

export interface StudySet {
  id: string
  title: string
  createdAt: number
  sourceFileName?: string
  sourceWordCount: number
  generationMode: GenerationMode
  summary: string[]
  terms: string[]
  concepts?: Concept[]
  flashcards: Flashcard[]
  quiz: QuizQuestion[]
  quizAttempts: QuizAttempt[]
  matchAttempts: MatchAttempt[]
}
