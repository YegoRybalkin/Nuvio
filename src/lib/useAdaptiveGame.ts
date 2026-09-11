import { useMemo, useReducer } from 'react'
import { nextDifficulty, scoreForAnswer } from './gameLogic'
import { useAnswerQuestion } from './useAnswerQuestion'
import type { Confidence, DifficultyLevel, Question, QuestionAttempt } from '../types'

interface GameState {
  difficulty: DifficultyLevel
  consecutiveSameResult: number
  lastWasCorrect: boolean | null
  streak: number
  score: number
  questionsAttempted: number
  correctCount: number
  difficultyReached: DifficultyLevel
  usedIds: string[]
  currentQuestion: Question | null
  weaknesses: string[]
}

type Action =
  | { type: 'answered'; attempt: QuestionAttempt; question: Question }
  | { type: 'advance'; pool: Question[] }

function pickQuestion(pool: Question[], usedIds: string[], difficulty: DifficultyLevel): Question | null {
  const used = new Set(usedIds)
  const available = pool.filter((q) => !used.has(q.id))
  if (available.length === 0) return null
  return [...available].sort((a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty))[0]
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'answered': {
      const correct = action.attempt.correctness === 'correct'
      const consecutiveSameResult = state.lastWasCorrect === correct ? state.consecutiveSameResult + 1 : 1
      const difficulty = nextDifficulty(state.difficulty, consecutiveSameResult, correct)
      const streak = correct ? state.streak + 1 : 0
      const scoreDelta = scoreForAnswer(action.question.difficulty, action.attempt.correctness, action.attempt.hintsUsed, state.streak)
      return {
        ...state,
        difficulty,
        consecutiveSameResult,
        lastWasCorrect: correct,
        streak,
        score: state.score + scoreDelta,
        questionsAttempted: state.questionsAttempted + 1,
        correctCount: state.correctCount + (correct ? 1 : 0),
        difficultyReached: Math.max(state.difficultyReached, action.question.difficulty) as DifficultyLevel,
        weaknesses: correct ? state.weaknesses : [...new Set([...state.weaknesses, action.question.conceptId])],
      }
    }
    case 'advance': {
      const usedIds = state.currentQuestion ? [...state.usedIds, state.currentQuestion.id] : state.usedIds
      return { ...state, usedIds, currentQuestion: pickQuestion(action.pool, usedIds, state.difficulty) }
    }
  }
}

function initState(pool: Question[], startDifficulty: DifficultyLevel): GameState {
  return {
    difficulty: startDifficulty,
    consecutiveSameResult: 0,
    lastWasCorrect: null,
    streak: 0,
    score: 0,
    questionsAttempted: 0,
    correctCount: 0,
    difficultyReached: startDifficulty,
    usedIds: [],
    currentQuestion: pickQuestion(pool, [], startDifficulty),
    weaknesses: [],
  }
}

/** Shared engine behind Survival, Boss Battle, Speed Round, Mystery Mode,
 * Error Revenge, Calculation Arena, and Knowledge Duel: adaptive difficulty
 * (two-in-a-row ramps up or down), streaks, and a game-score formula kept
 * deliberately separate from mastery (see gameLogic.ts / mastery.ts). Each
 * mode wraps this with its own lives/health/timer end-condition and HUD. */
export function useAdaptiveGame(pool: Question[], startDifficulty: DifficultyLevel = 1) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(pool, startDifficulty))
  const { answer, grading, lastAttempt, reset } = useAnswerQuestion('game')

  const submit = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, responseTimeMs: number) => {
    if (!state.currentQuestion) return null
    const attempt = await answer(state.currentQuestion, raw, confidence, hintsUsed, responseTimeMs)
    dispatch({ type: 'answered', attempt, question: state.currentQuestion })
    return attempt
  }

  const advance = () => {
    reset()
    dispatch({ type: 'advance', pool })
  }

  const accuracy = useMemo(
    () => (state.questionsAttempted ? Math.round((state.correctCount / state.questionsAttempted) * 100) : 0),
    [state.questionsAttempted, state.correctCount],
  )

  return { state, accuracy, grading, lastAttempt, submit, advance }
}
