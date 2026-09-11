import type { DifficultyLevel, MasteryBand, QuestionAttempt } from '../types'

export interface MasteryScore {
  conceptId: string
  courseId: string
  score: number
  band: MasteryBand
  attemptsCount: number
  correctStreak: number
  lastAttemptAt: number
}

const HISTORY_WINDOW = 8
const RECENCY_DECAY = 0.85
const SPACING_WINDOW_MS = 24 * 60 * 60 * 1000

function difficultyWeight(difficulty: DifficultyLevel): number {
  return 0.6 + difficulty * 0.1
}

function hintPenalty(hintsUsed: number): number {
  return Math.max(0, 1 - hintsUsed * 0.15)
}

function confidenceAdjustment(attempt: QuestionAttempt): number {
  if (!attempt.confidence) return 1
  if (attempt.confidence === 'high' && attempt.correctness === 'incorrect') return 0.7
  if (attempt.confidence === 'low' && attempt.correctness === 'correct') return 1.1
  return 1
}

export function bandFromScore(score: number): MasteryBand {
  if (score <= 30) return 'weak'
  if (score <= 60) return 'developing'
  if (score <= 80) return 'good'
  return 'mastered'
}

/** Weighted-average mastery score from attempt history: correctness x
 * difficulty x confidence-calibration x hint usage, recency-weighted so
 * recent performance matters more, with two deliberate dampers so a single
 * lucky answer can never read as mastery:
 *   - fewer than 3 attempts caps the score at 70 ("good" at most)
 *   - all attempts crammed into one short window caps it at 85 (mastery
 *     requires retrieval success spaced out over time, not just one sitting)
 * Never mutates or discards attempt history - callers pass the full history
 * and this always recomputes from scratch. */
export function computeMastery(conceptId: string, courseId: string, allAttempts: QuestionAttempt[]): MasteryScore {
  const attempts = allAttempts
    .filter((a) => a.conceptId === conceptId)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-HISTORY_WINDOW)

  if (attempts.length === 0) {
    return { conceptId, courseId, score: 0, band: 'weak', attemptsCount: 0, correctStreak: 0, lastAttemptAt: 0 }
  }

  let weightedSum = 0
  let weightTotal = 0
  attempts.forEach((attempt, i) => {
    const recency = RECENCY_DECAY ** (attempts.length - 1 - i)
    const pointValue = attempt.score * difficultyWeight(attempt.difficulty) * hintPenalty(attempt.hintsUsed) * confidenceAdjustment(attempt)
    weightedSum += pointValue * recency
    weightTotal += recency
  })

  let score = weightTotal > 0 ? weightedSum / weightTotal : 0

  if (attempts.length < 3) {
    score = Math.min(score, 70)
  } else {
    const span = attempts[attempts.length - 1].timestamp - attempts[0].timestamp
    if (span < SPACING_WINDOW_MS && attempts.length < 5) {
      score = Math.min(score, 85)
    }
  }

  score = Math.round(Math.max(0, Math.min(100, score)))

  let correctStreak = 0
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].correctness === 'incorrect') break
    correctStreak++
  }

  return {
    conceptId,
    courseId,
    score,
    band: bandFromScore(score),
    attemptsCount: attempts.length,
    correctStreak,
    lastAttemptAt: attempts[attempts.length - 1].timestamp,
  }
}

/** Flags "high confidence + wrong" (priority misconception) and "low
 * confidence + correct" (fragile knowledge, needs reinforcement) so the
 * session generator and dashboard can surface them. */
export function calibrationFlag(attempt: QuestionAttempt): 'overconfident' | 'underconfident' | null {
  if (attempt.confidence === 'high' && attempt.correctness === 'incorrect') return 'overconfident'
  if (attempt.confidence === 'low' && attempt.correctness === 'correct') return 'underconfident'
  return null
}
