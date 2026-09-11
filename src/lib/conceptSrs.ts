import { schedule } from './srs'
import type { Grade, QuestionAttempt, SrsState } from '../types'

/** Maps a graded attempt onto the 4-bucket SM-2 grade scale, folding in
 * confidence and hint usage the way the spec calls for ("adjust based on
 * correctness, difficulty, hints, confidence, response speed"): a correct
 * answer that took hints or came with low confidence schedules like "hard"
 * rather than "easy", and a high-confidence wrong answer is treated as a
 * harder miss than a shaky one (still "again" either way, but the mastery
 * engine is what actually captures that severity - this only feeds timing). */
export function deriveGradeFromAttempt(attempt: QuestionAttempt): Grade {
  if (attempt.correctness === 'incorrect') return 'again'

  if (attempt.correctness === 'partial') return 'hard'

  // correctness === 'correct'
  if (attempt.hintsUsed > 0) return 'hard'
  if (attempt.confidence === 'low') return 'good'
  if (attempt.confidence === 'high' && attempt.hintsUsed === 0) return 'easy'
  return 'good'
}

export function scheduleConceptReview(prevSrs: SrsState, attempt: QuestionAttempt, now = Date.now()): SrsState {
  return schedule(prevSrs, deriveGradeFromAttempt(attempt), now)
}
