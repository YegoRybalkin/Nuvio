import type { AiOpponentLevel, Correctness, DifficultyLevel } from '../types'

/** Game score is deliberately kept separate from mastery (see mastery.ts) -
 * it rewards fun/engagement signals (difficulty, independence, streaks) but
 * must never be read as evidence of learning on its own. */
export function scoreForAnswer(
  difficulty: DifficultyLevel,
  correctness: Correctness,
  hintsUsed: number,
  streak: number,
): number {
  const base = 10
  const correctnessMultiplier = correctness === 'correct' ? 1 : correctness === 'partial' ? 0.4 : 0
  if (correctnessMultiplier === 0) return 0
  const independenceMultiplier = hintsUsed === 0 ? 1 : hintsUsed === 1 ? 0.8 : 0.6
  const streakModifier = 1 + Math.min(streak, 10) * 0.05
  return Math.round(base * difficulty * independenceMultiplier * streakModifier * correctnessMultiplier)
}

const DAMAGE_BY_DIFFICULTY: Record<DifficultyLevel, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 }

export function damageForDifficulty(difficulty: DifficultyLevel): number {
  return DAMAGE_BY_DIFFICULTY[difficulty]
}

/** Adaptive difficulty: two correct answers in a row at the current level
 * bumps it up; two wrong in a row eases it back down. Aims for "productive
 * struggle" rather than a flat ramp or an always-easy ride. */
export function nextDifficulty(current: DifficultyLevel, consecutiveSameResult: number, wasCorrect: boolean): DifficultyLevel {
  if (wasCorrect && consecutiveSameResult >= 2) return Math.min(5, current + 1) as DifficultyLevel
  if (!wasCorrect && consecutiveSameResult >= 2) return Math.max(1, current - 1) as DifficultyLevel
  return current
}

const OPPONENT_BASE_ACCURACY: Record<AiOpponentLevel, number> = {
  rookie: 0.5,
  student: 0.65,
  expert: 0.8,
  professor: 0.92,
}

const OPPONENT_RESPONSE_RANGE_MS: Record<AiOpponentLevel, [number, number]> = {
  rookie: [5000, 10000],
  student: [4000, 8000],
  expert: [3000, 6000],
  professor: [2000, 4000],
}

/** Simulates an AI opponent's answer for Knowledge Duel rather than making a
 * live model call per round (keeps duels instant and free to play many
 * rounds of) - accuracy scales down with question difficulty and up with
 * the chosen opponent level. */
export function simulateOpponentAnswer(level: AiOpponentLevel, difficulty: DifficultyLevel): { correct: boolean; responseMs: number } {
  const accuracy = Math.max(0.05, OPPONENT_BASE_ACCURACY[level] - (difficulty - 1) * 0.06)
  const [min, max] = OPPONENT_RESPONSE_RANGE_MS[level]
  return { correct: Math.random() < accuracy, responseMs: Math.round(min + Math.random() * (max - min)) }
}

export const OPPONENT_LABELS: Record<AiOpponentLevel, string> = {
  rookie: 'Rookie',
  student: 'Student',
  expert: 'Expert',
  professor: 'Professor',
}
