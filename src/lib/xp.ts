import type { QuestionAttempt } from '../types'

/** XP for ordinary practice/session answers - a light "did you show up and
 * retrieve something" reward, separate from game score and from mastery.
 * Deliberately does not reward idle actions, only actual retrieval. */
export function xpForAttempt(attempt: Pick<QuestionAttempt, 'correctness' | 'difficulty' | 'hintsUsed'>): number {
  const base = attempt.correctness === 'correct' ? 8 : attempt.correctness === 'partial' ? 4 : 1
  const difficultyBonus = 1 + (attempt.difficulty - 1) * 0.15
  const hintPenalty = Math.max(0.4, 1 - attempt.hintsUsed * 0.2)
  return Math.round(base * difficultyBonus * hintPenalty)
}
