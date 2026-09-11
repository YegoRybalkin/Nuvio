import type { ErrorCategory, Question, QuestionAttempt } from '../types'

const uid = () => crypto.randomUUID()

/** Best-effort, deterministic categorization of a wrong/partial attempt.
 * There's no ground truth for "why" a student got something wrong, so this
 * uses the signals we actually have (question type, response time, whether
 * an answer was given at all, any AI-detected misconception) rather than
 * guessing via another LLM call for every miss. */
export function categorizeError(question: Question, attempt: QuestionAttempt): ErrorCategory {
  if (attempt.misconceptionTag) return 'conceptual'
  if (!attempt.studentAnswer.trim()) return 'forgotten'
  if (attempt.responseTimeMs > 0 && attempt.responseTimeMs < 3000 && attempt.correctness === 'incorrect') {
    return 'careless'
  }

  switch (question.type) {
    case 'calculation':
      return 'calculation'
    case 'identify_method':
      return 'formula_selection'
    case 'correct_error':
      return 'application'
    case 'definition':
    case 'identify_concept':
      return attempt.correctness === 'partial' ? 'terminology' : 'conceptual'
    case 'scenario':
    case 'teach_back':
      return 'application'
    default:
      return 'conceptual'
  }
}

export function shouldLogError(attempt: QuestionAttempt): boolean {
  return attempt.correctness !== 'correct'
}

export function createErrorRecord(question: Question, attempt: QuestionAttempt) {
  return {
    id: uid(),
    attemptId: attempt.id,
    questionId: question.id,
    conceptId: question.conceptId,
    topicId: question.topicId,
    courseId: question.courseId,
    category: categorizeError(question, attempt),
    date: attempt.timestamp,
    corrected: false,
    reviewAttemptIds: [] as string[],
  }
}

export const ERROR_CATEGORY_LABEL: Record<ErrorCategory, string> = {
  conceptual: 'Conceptual misunderstanding',
  formula_selection: 'Formula/method selection',
  calculation: 'Calculation mistake',
  terminology: 'Terminology confusion',
  misread: 'Misread question',
  application: 'Application error',
  forgotten: 'Forgotten information',
  careless: 'Careless error',
}
