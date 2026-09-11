import type { Grade, SrsState } from '../types'

// A standard SM-2 spaced-repetition scheduler (the algorithm behind Anki and
// SuperMemo), used here to schedule concept review rather than flashcards
// directly - see conceptSrs.ts for how a QuestionAttempt becomes a Grade.

const MIN_EASE = 1.3

export function initialSrsState(): SrsState {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: Date.now(),
    lastGrade: null,
    lapses: 0,
  }
}

const GRADE_QUALITY: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.dueAt <= now
}

/** Advances SRS state after a review. `quality` follows SM-2's 0-5 scale,
 * derived here from the four-button grade a learner actually taps. */
export function schedule(state: SrsState, grade: Grade, now = Date.now()): SrsState {
  const quality = GRADE_QUALITY[grade]

  if (quality < 3) {
    return {
      ...state,
      repetitions: 0,
      intervalDays: 0,
      lastGrade: grade,
      lapses: state.lapses + 1,
      // Failed cards come back in ~10 minutes, within the same study session.
      dueAt: now + 10 * 60 * 1000,
      easeFactor: Math.max(MIN_EASE, state.easeFactor - 0.2),
    }
  }

  const repetitions = state.repetitions + 1
  let intervalDays: number
  if (repetitions === 1) intervalDays = 1
  else if (repetitions === 2) intervalDays = 6
  else intervalDays = Math.round(state.intervalDays * state.easeFactor)

  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  const easeFactor = Math.max(MIN_EASE, state.easeFactor + easeDelta)

  return {
    repetitions,
    easeFactor,
    intervalDays,
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    lastGrade: grade,
    lapses: state.lapses,
  }
}

export function dueCount(states: SrsState[], now = Date.now()): number {
  return states.filter((s) => isDue(s, now)).length
}
