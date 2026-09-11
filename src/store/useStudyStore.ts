import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { schedule } from '../lib/srs'
import type { Grade, QuizAttempt, StudySet } from '../types'

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
}

interface StudyStore extends GamificationState {
  studySets: StudySet[]
  addStudySet: (set: StudySet) => void
  removeStudySet: (id: string) => void
  renameStudySet: (id: string, title: string) => void
  gradeFlashcard: (setId: string, cardId: string, grade: Grade) => void
  recordQuizAttempt: (setId: string, attempt: QuizAttempt, xpEarned: number) => void
  addXp: (amount: number) => void
}

type StreakFields = Pick<GamificationState, 'streakDays' | 'lastActiveDay' | 'bestStreak'>

/** Bumps the daily streak at most once per calendar day. Deliberately returns
 * only the streak-related fields (never `studySets` or `xp`) so spreading its
 * result into a reducer's return value can never clobber unrelated updates. */
function touchStreak(state: GamificationState): StreakFields {
  const today = startOfDay(Date.now())
  if (state.lastActiveDay === today) {
    return { streakDays: state.streakDays, lastActiveDay: state.lastActiveDay, bestStreak: state.bestStreak }
  }
  const wasYesterday = state.lastActiveDay === today - DAY_MS
  const streakDays = wasYesterday ? state.streakDays + 1 : 1
  return { lastActiveDay: today, streakDays, bestStreak: Math.max(state.bestStreak, streakDays) }
}

export const useStudyStore = create<StudyStore>()(
  persist(
    (set) => ({
      studySets: [],
      xp: 0,
      streakDays: 0,
      lastActiveDay: null,
      bestStreak: 0,

      addStudySet: (studySet) =>
        set((state) => ({
          studySets: [studySet, ...state.studySets],
          ...touchStreak(state),
        })),

      removeStudySet: (id) =>
        set((state) => ({ studySets: state.studySets.filter((s) => s.id !== id) })),

      renameStudySet: (id, title) =>
        set((state) => ({
          studySets: state.studySets.map((s) => (s.id === id ? { ...s, title } : s)),
        })),

      gradeFlashcard: (setId, cardId, grade) => {
        const xpForGrade: Record<Grade, number> = { again: 1, hard: 4, good: 6, easy: 8 }
        set((state) => ({
          studySets: state.studySets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  flashcards: s.flashcards.map((c) =>
                    c.id === cardId ? { ...c, srs: schedule(c.srs, grade) } : c,
                  ),
                }
              : s,
          ),
          ...touchStreak(state),
          xp: state.xp + xpForGrade[grade],
        }))
      },

      recordQuizAttempt: (setId, attempt, xpEarned) =>
        set((state) => ({
          studySets: state.studySets.map((s) =>
            s.id === setId ? { ...s, quizAttempts: [...s.quizAttempts, attempt] } : s,
          ),
          ...touchStreak(state),
          xp: state.xp + xpEarned,
        })),

      addXp: (amount) => set((state) => ({ xp: state.xp + amount })),
    }),
    { name: 'nuvio-study-store' },
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
