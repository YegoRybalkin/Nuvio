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

export interface Concept {
  name: string
  explanation: string
  whyItMatters: string
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
}
