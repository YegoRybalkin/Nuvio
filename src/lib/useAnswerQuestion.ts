import { useState } from 'react'
import { gradeAttempt } from './attemptGrading'
import { xpForAttempt } from './xp'
import { useCourseStore } from '../store/useCourseStore'
import type { Confidence, Question, QuestionAttempt } from '../types'

/** Shared "answer a question, grade it, record it" flow used by Practice,
 * Study Sessions, Mock Exams, and every game mode - keeps grading logic and
 * store writes in one place instead of duplicated per surface. */
export function useAnswerQuestion(source: QuestionAttempt['source']) {
  const commitAttempt = useCourseStore((s) => s.commitAttempt)
  const claudeApiKey = useCourseStore((s) => s.claudeApiKey)
  const claudeModel = useCourseStore((s) => s.claudeModel)
  const [grading, setGrading] = useState(false)
  const [lastAttempt, setLastAttempt] = useState<QuestionAttempt | null>(null)

  const answer = async (
    question: Question,
    raw: string,
    confidence: Confidence | undefined,
    hintsUsed: number,
    responseTimeMs: number,
  ): Promise<QuestionAttempt> => {
    setGrading(true)
    try {
      const draft = await gradeAttempt(question, raw, {
        confidence,
        hintsUsed,
        responseTimeMs,
        source,
        claude: claudeApiKey ? { apiKey: claudeApiKey, model: claudeModel } : undefined,
      })
      const xp = xpForAttempt(draft)
      const attempt = commitAttempt(question, draft, xp)
      setLastAttempt(attempt)
      return attempt
    } finally {
      setGrading(false)
    }
  }

  const reset = () => setLastAttempt(null)

  return { grading, lastAttempt, answer, reset }
}
