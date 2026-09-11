// ---- Shared primitives -----------------------------------------------

export type Grade = 'again' | 'hard' | 'good' | 'easy'
export type Importance = 'core' | 'supporting' | 'minor'
export type SubjectType = 'theory' | 'quantitative' | 'economics' | 'accounting' | 'generic'
export type Confidence = 'low' | 'medium' | 'high'
export type Correctness = 'correct' | 'partial' | 'incorrect'
export type MasteryBand = 'weak' | 'developing' | 'good' | 'mastered'
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export type QuestionType =
  | 'mcq'
  | 'free_response'
  | 'definition'
  | 'explain_why'
  | 'compare'
  | 'scenario'
  | 'calculation'
  | 'identify_concept'
  | 'identify_method'
  | 'correct_error'
  | 'teach_back'
  | 'short_answer'

export type ErrorCategory =
  | 'conceptual'
  | 'formula_selection'
  | 'calculation'
  | 'terminology'
  | 'misread'
  | 'application'
  | 'forgotten'
  | 'careless'

export interface SrsState {
  repetitions: number
  easeFactor: number
  intervalDays: number
  dueAt: number
  lastGrade: Grade | null
  lapses: number
}

// ---- Course structure ---------------------------------------------------

export interface Course {
  id: string
  name: string
  subjectType: SubjectType
  createdAt: number
  materialIds: string[]
  topicIds: string[]
  examIds: string[]
  isDemo?: boolean
}

export interface SourceChunk {
  id: string
  materialId: string
  index: number
  text: string
}

export interface SourceMaterial {
  id: string
  courseId: string
  fileName: string
  uploadedAt: number
  wordCount: number
  chunks: SourceChunk[]
  status: 'processing' | 'ready' | 'failed'
  error?: string
}

export interface SourceRef {
  materialId: string
  chunkId: string
  excerpt: string
}

export interface Topic {
  id: string
  courseId: string
  name: string
  importance: Importance
  conceptIds: string[]
}

export interface Concept {
  id: string
  courseId: string
  topicId: string
  name: string
  definition: string
  learningObjective: string
  formula?: string
  examples: string[]
  misconceptions: string[]
  sourceRefs: SourceRef[]
  importance: Importance
}

// ---- Questions & attempts -------------------------------------------------

export interface Question {
  id: string
  courseId: string
  topicId: string
  conceptId: string
  type: QuestionType
  difficulty: DifficultyLevel
  prompt: string
  choices?: string[]
  correctIndex?: number
  correctAnswer: string
  numericAnswer?: number
  tolerance?: number
  rubric: string[]
  explanation: string
  sourceRefs: SourceRef[]
  createdAt: number
}

export interface AttemptFeedback {
  whatWasCorrect: string
  whatWasMissing: string
  whatWasWrong: string
  improvementTip: string
}

export interface QuestionAttempt {
  id: string
  questionId: string
  conceptId: string
  topicId: string
  courseId: string
  difficulty: DifficultyLevel
  timestamp: number
  studentAnswer: string
  correctness: Correctness
  score: number
  feedback: AttemptFeedback
  misconceptionTag?: string
  confidence?: Confidence
  hintsUsed: number
  responseTimeMs: number
  gradedBy: 'ai' | 'deterministic' | 'mcq' | 'self' | 'heuristic'
  source: 'practice' | 'session' | 'mock_exam' | 'game'
}

export interface MasteryState {
  conceptId: string
  courseId: string
  score: number
  band: MasteryBand
  attemptsCount: number
  correctStreak: number
  lastAttemptAt: number
  srs: SrsState
}

export interface ErrorRecord {
  id: string
  attemptId: string
  questionId: string
  conceptId: string
  topicId: string
  courseId: string
  category: ErrorCategory
  date: number
  corrected: boolean
  correctedAt?: number
  reviewAttemptIds: string[]
}

// ---- Exams ---------------------------------------------------------------

export interface Exam {
  id: string
  courseId: string
  name: string
  date: number
  topicIds: string[]
  format: string
  weighting?: string
  durationMin: number
  notes?: string
}

export interface MockExamAttempt {
  id: string
  examId: string
  courseId: string
  date: number
  questionIds: string[]
  attemptIds: string[]
  score: number
  topicBreakdown: { topicId: string; topicName: string; accuracy: number }[]
  timeSpentMin: number
  durationMin: number
}

// ---- Study sessions --------------------------------------------------------

export type SessionPurpose = 'retrieval' | 'weak' | 'application' | 'spaced_review' | 'challenge'

export interface StudySessionSegment {
  label: string
  minutes: number
  purpose: SessionPurpose
  questionIds: string[]
}

export interface StudySessionRecord {
  id: string
  courseId: string | 'all'
  startedAt: number
  durationMin: number
  segments: StudySessionSegment[]
  completedQuestionIds: string[]
  xpEarned: number
  finishedAt?: number
}

// ---- Games -----------------------------------------------------------------

export type GameMode =
  | 'survival'
  | 'boss_battle'
  | 'speed_round'
  | 'mystery'
  | 'case_detective'
  | 'error_revenge'
  | 'knowledge_duel'
  | 'exam_quest'
  | 'calculation_arena'
  | 'daily_challenge'

export type AiOpponentLevel = 'rookie' | 'student' | 'expert' | 'professor'

export interface GameSessionRecord {
  id: string
  mode: GameMode
  courseId: string
  startedAt: number
  endedAt: number
  score: number
  accuracy: number
  highestStreak: number
  questionsAttempted: number
  correct: number
  difficultyReached: DifficultyLevel
  result: 'won' | 'lost' | 'completed'
  weaknessesFound: string[]
  opponentLevel?: AiOpponentLevel
  opponentScore?: number
}

// ---- Tutor -----------------------------------------------------------------

export interface TutorMessage {
  role: 'user' | 'tutor'
  content: string
  timestamp: number
}

export interface TutorConversation {
  id: string
  courseId: string
  conceptId?: string
  messages: TutorMessage[]
  hintLevel: number
  createdAt: number
}

// ---- Gamification -----------------------------------------------------------

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: number
}
