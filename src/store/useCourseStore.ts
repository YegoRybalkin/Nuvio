import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CLAUDE_MODEL } from '../lib/courseAi'
import { scheduleConceptReview } from '../lib/conceptSrs'
import { createErrorRecord, shouldLogError } from '../lib/errorLog'
import type { MaterializedAnalysis } from '../lib/courseIngestion'
import { computeMastery } from '../lib/mastery'
import { initialSrsState } from '../lib/srs'
import type {
  Achievement,
  Concept,
  Course,
  Exam,
  ErrorRecord,
  GameSessionRecord,
  MasteryState,
  MockExamAttempt,
  Question,
  QuestionAttempt,
  SourceMaterial,
  StudySessionRecord,
  SubjectType,
  Topic,
  TutorConversation,
  TutorMessage,
} from '../types'

const uid = () => crypto.randomUUID()

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const DAY_MS = 24 * 60 * 60 * 1000

interface GamificationState {
  xp: number
  streakDays: number
  lastActiveDay: number | null
  bestStreak: number
  achievements: Achievement[]
}

interface AiSettingsState {
  claudeApiKey: string
  claudeModel: string
}

interface CourseStoreState extends GamificationState, AiSettingsState {
  courses: Course[]
  materials: SourceMaterial[]
  topics: Topic[]
  concepts: Concept[]
  questions: Question[]
  attempts: QuestionAttempt[]
  masteryStates: MasteryState[]
  errors: ErrorRecord[]
  exams: Exam[]
  mockExams: MockExamAttempt[]
  studySessions: StudySessionRecord[]
  gameSessions: GameSessionRecord[]
  tutorConversations: TutorConversation[]
}

interface CourseStoreActions {
  addCourse: (name: string, subjectType: SubjectType) => Course
  removeCourse: (id: string) => void

  addMaterialPlaceholder: (courseId: string, fileName: string, wordCount: number) => SourceMaterial
  markMaterialFailed: (materialId: string, error: string) => void
  ingestMaterial: (materialId: string, chunks: SourceMaterial['chunks'], analysis: MaterializedAnalysis) => void

  commitAttempt: (question: Question, attempt: Omit<QuestionAttempt, 'id'>, xpEarned: number) => QuestionAttempt
  markErrorCorrected: (errorId: string) => void

  addExam: (exam: Omit<Exam, 'id'>) => Exam
  removeExam: (id: string) => void
  recordMockExam: (attempt: Omit<MockExamAttempt, 'id'>) => MockExamAttempt

  recordStudySession: (session: Omit<StudySessionRecord, 'id'>) => StudySessionRecord
  recordGameSession: (session: Omit<GameSessionRecord, 'id'>) => GameSessionRecord

  getOrCreateTutorConversation: (courseId: string, conceptId?: string) => TutorConversation
  addTutorMessage: (conversationId: string, message: TutorMessage) => void
  setTutorHintLevel: (conversationId: string, hintLevel: number) => void

  unlockAchievement: (id: string, name: string, description: string) => void
  addXp: (amount: number) => void

  setClaudeApiKey: (key: string) => void
  setClaudeModel: (model: string) => void

  loadDemoData: (payload: {
    courses: Course[]
    topics: Topic[]
    concepts: Concept[]
    questions: Question[]
    attempts: QuestionAttempt[]
    exams: Exam[]
    errors: ErrorRecord[]
  }) => void
  resetDemoData: () => void
  resetAllData: () => void
}

type CourseStore = CourseStoreState & CourseStoreActions

type StreakFields = Pick<GamificationState, 'streakDays' | 'lastActiveDay' | 'bestStreak'>

/** Bumps the daily streak at most once per calendar day. Deliberately returns
 * only the streak fields (never any data array) so spreading its result into
 * a reducer's return value can never clobber an unrelated update made in the
 * same action - see the git history for why this matters. */
function touchStreak(state: GamificationState): StreakFields {
  const today = startOfDay(Date.now())
  if (state.lastActiveDay === today) {
    return { streakDays: state.streakDays, lastActiveDay: state.lastActiveDay, bestStreak: state.bestStreak }
  }
  const wasYesterday = state.lastActiveDay === today - DAY_MS
  const streakDays = wasYesterday ? state.streakDays + 1 : 1
  return { lastActiveDay: today, streakDays, bestStreak: Math.max(state.bestStreak, streakDays) }
}

const EMPTY_STATE: CourseStoreState = {
  courses: [],
  materials: [],
  topics: [],
  concepts: [],
  questions: [],
  attempts: [],
  masteryStates: [],
  errors: [],
  exams: [],
  mockExams: [],
  studySessions: [],
  gameSessions: [],
  tutorConversations: [],
  xp: 0,
  streakDays: 0,
  lastActiveDay: null,
  bestStreak: 0,
  achievements: [],
  claudeApiKey: '',
  claudeModel: DEFAULT_CLAUDE_MODEL,
}

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,

      addCourse: (name, subjectType) => {
        const course: Course = {
          id: uid(),
          name,
          subjectType,
          createdAt: Date.now(),
          materialIds: [],
          topicIds: [],
          examIds: [],
        }
        set((state) => ({ courses: [course, ...state.courses] }))
        return course
      },

      removeCourse: (id) =>
        set((state) => ({
          courses: state.courses.filter((c) => c.id !== id),
          materials: state.materials.filter((m) => m.courseId !== id),
          topics: state.topics.filter((t) => t.courseId !== id),
          concepts: state.concepts.filter((c) => c.courseId !== id),
          questions: state.questions.filter((q) => q.courseId !== id),
          attempts: state.attempts.filter((a) => a.courseId !== id),
          masteryStates: state.masteryStates.filter((m) => m.courseId !== id),
          errors: state.errors.filter((e) => e.courseId !== id),
          exams: state.exams.filter((e) => e.courseId !== id),
          mockExams: state.mockExams.filter((m) => m.courseId !== id),
        })),

      addMaterialPlaceholder: (courseId, fileName, wordCount) => {
        const material: SourceMaterial = {
          id: uid(),
          courseId,
          fileName,
          uploadedAt: Date.now(),
          wordCount,
          chunks: [],
          status: 'processing',
        }
        set((state) => ({
          materials: [material, ...state.materials],
          courses: state.courses.map((c) => (c.id === courseId ? { ...c, materialIds: [material.id, ...c.materialIds] } : c)),
        }))
        return material
      },

      markMaterialFailed: (materialId, error) =>
        set((state) => ({
          materials: state.materials.map((m) => (m.id === materialId ? { ...m, status: 'failed', error } : m)),
        })),

      ingestMaterial: (materialId, chunks, analysis) =>
        set((state) => {
          const material = state.materials.find((m) => m.id === materialId)
          if (!material) return state
          return {
            materials: state.materials.map((m) => (m.id === materialId ? { ...m, chunks, status: 'ready' } : m)),
            topics: [...state.topics, ...analysis.topics],
            concepts: [...state.concepts, ...analysis.concepts],
            questions: [...state.questions, ...analysis.questions],
            courses: state.courses.map((c) =>
              c.id === material.courseId ? { ...c, topicIds: [...c.topicIds, ...analysis.topics.map((t) => t.id)] } : c,
            ),
            ...touchStreak(state),
          }
        }),

      commitAttempt: (question, attemptDraft, xpEarned) => {
        const attempt: QuestionAttempt = { ...attemptDraft, id: uid() }
        set((state) => {
          const attempts = [...state.attempts, attempt]
          const scoreState = computeMastery(question.conceptId, question.courseId, attempts)
          const prevMastery = state.masteryStates.find((m) => m.conceptId === question.conceptId)
          const prevSrs = prevMastery?.srs ?? initialSrsState()
          const srs = scheduleConceptReview(prevSrs, attempt)
          const newMastery: MasteryState = { ...scoreState, srs }

          const errors = shouldLogError(attempt)
            ? [...state.errors, createErrorRecord(question, attempt)]
            : state.errors

          const touched = touchStreak(state)
          return {
            attempts,
            masteryStates: prevMastery
              ? state.masteryStates.map((m) => (m.conceptId === question.conceptId ? newMastery : m))
              : [...state.masteryStates, newMastery],
            errors,
            ...touched,
            xp: state.xp + xpEarned,
          }
        })
        return attempt
      },

      markErrorCorrected: (errorId) =>
        set((state) => ({
          errors: state.errors.map((e) => (e.id === errorId ? { ...e, corrected: true, correctedAt: Date.now() } : e)),
        })),

      addExam: (examDraft) => {
        const exam: Exam = { ...examDraft, id: uid() }
        set((state) => ({
          exams: [...state.exams, exam],
          courses: state.courses.map((c) => (c.id === exam.courseId ? { ...c, examIds: [...c.examIds, exam.id] } : c)),
        }))
        return exam
      },

      removeExam: (id) =>
        set((state) => ({
          exams: state.exams.filter((e) => e.id !== id),
          courses: state.courses.map((c) => ({ ...c, examIds: c.examIds.filter((eid) => eid !== id) })),
        })),

      recordMockExam: (draft) => {
        const attempt: MockExamAttempt = { ...draft, id: uid() }
        set((state) => ({ mockExams: [...state.mockExams, attempt], ...touchStreak(state) }))
        return attempt
      },

      recordStudySession: (draft) => {
        const session: StudySessionRecord = { ...draft, id: uid() }
        set((state) => ({
          studySessions: [...state.studySessions, session],
          ...touchStreak(state),
          xp: state.xp + session.xpEarned,
        }))
        return session
      },

      recordGameSession: (draft) => {
        const session: GameSessionRecord = { ...draft, id: uid() }
        set((state) => ({ gameSessions: [...state.gameSessions, session], ...touchStreak(state) }))
        return session
      },

      getOrCreateTutorConversation: (courseId, conceptId) => {
        const existing = get().tutorConversations.find(
          (t) => t.courseId === courseId && t.conceptId === conceptId,
        )
        if (existing) return existing
        const convo: TutorConversation = { id: uid(), courseId, conceptId, messages: [], hintLevel: 0, createdAt: Date.now() }
        set((state) => ({ tutorConversations: [...state.tutorConversations, convo] }))
        return convo
      },

      addTutorMessage: (conversationId, message) =>
        set((state) => ({
          tutorConversations: state.tutorConversations.map((t) =>
            t.id === conversationId ? { ...t, messages: [...t.messages, message] } : t,
          ),
        })),

      setTutorHintLevel: (conversationId, hintLevel) =>
        set((state) => ({
          tutorConversations: state.tutorConversations.map((t) => (t.id === conversationId ? { ...t, hintLevel } : t)),
        })),

      unlockAchievement: (id, name, description) =>
        set((state) => {
          if (state.achievements.some((a) => a.id === id)) return state
          return { achievements: [...state.achievements, { id, name, description, unlockedAt: Date.now() }] }
        }),

      addXp: (amount) => set((state) => ({ xp: state.xp + amount })),

      setClaudeApiKey: (key) => set({ claudeApiKey: key.trim() }),
      setClaudeModel: (model) => set({ claudeModel: model }),

      loadDemoData: (payload) =>
        set((state) => ({
          courses: [...payload.courses, ...state.courses],
          topics: [...payload.topics, ...state.topics],
          concepts: [...payload.concepts, ...state.concepts],
          questions: [...payload.questions, ...state.questions],
          attempts: [...payload.attempts, ...state.attempts],
          exams: [...payload.exams, ...state.exams],
          errors: [...payload.errors, ...state.errors],
          masteryStates: [
            ...state.masteryStates,
            ...payload.concepts.map((c) => ({
              ...computeMastery(c.id, c.courseId, payload.attempts),
              srs: initialSrsState(),
            })),
          ],
        })),

      resetDemoData: () =>
        set((state) => {
          const demoCourseIds = new Set(state.courses.filter((c) => c.isDemo).map((c) => c.id))
          return {
            courses: state.courses.filter((c) => !c.isDemo),
            materials: state.materials.filter((m) => !demoCourseIds.has(m.courseId)),
            topics: state.topics.filter((t) => !demoCourseIds.has(t.courseId)),
            concepts: state.concepts.filter((c) => !demoCourseIds.has(c.courseId)),
            questions: state.questions.filter((q) => !demoCourseIds.has(q.courseId)),
            attempts: state.attempts.filter((a) => !demoCourseIds.has(a.courseId)),
            masteryStates: state.masteryStates.filter((m) => !demoCourseIds.has(m.courseId)),
            errors: state.errors.filter((e) => !demoCourseIds.has(e.courseId)),
            exams: state.exams.filter((e) => !demoCourseIds.has(e.courseId)),
            mockExams: state.mockExams.filter((m) => !demoCourseIds.has(m.courseId)),
          }
        }),

      resetAllData: () => set({ ...EMPTY_STATE, claudeApiKey: get().claudeApiKey, claudeModel: get().claudeModel }),
    }),
    { name: 'nuvio-course-store-v1' },
  ),
)

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const xpForNextLevel = (level: number) => 40 + level * 20
  let level = 1
  let remaining = xp
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level)
    level += 1
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpForNextLevel(level) }
}
