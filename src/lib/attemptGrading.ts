import { correctnessFromScore, gradeOpenResponse, type ClaudeSettings } from './courseAi'
import { STOPWORDS, tokenize } from './nlp'
import type { AttemptFeedback, Confidence, Correctness, Question, QuestionAttempt } from '../types'

export interface GradeContext {
  confidence?: Confidence
  hintsUsed: number
  responseTimeMs: number
  source: QuestionAttempt['source']
  claude?: ClaudeSettings
}

type DraftAttempt = Omit<QuestionAttempt, 'id'>

function baseDraft(question: Question, rawAnswer: string, ctx: GradeContext): Pick<
  DraftAttempt,
  'questionId' | 'conceptId' | 'topicId' | 'courseId' | 'difficulty' | 'timestamp' | 'studentAnswer' | 'confidence' | 'hintsUsed' | 'responseTimeMs' | 'source'
> {
  return {
    questionId: question.id,
    conceptId: question.conceptId,
    topicId: question.topicId,
    courseId: question.courseId,
    difficulty: question.difficulty,
    timestamp: Date.now(),
    studentAnswer: rawAnswer,
    confidence: ctx.confidence,
    hintsUsed: ctx.hintsUsed,
    responseTimeMs: ctx.responseTimeMs,
    source: ctx.source,
  }
}

function extractFirstNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, '')
  const match = cleaned.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

/** Deterministic numeric grading: extracts the first number in the answer and
 * compares it to the question's exact numeric answer within a tolerance band,
 * rather than asking an LLM to judge arithmetic. Returns null if the answer
 * contains no parseable number (e.g. the student only wrote reasoning), so the
 * caller can fall back to grading the reasoning instead. */
function gradeCalculation(question: Question, rawAnswer: string): { score: number; correctness: Correctness } | null {
  if (question.numericAnswer === undefined) return null
  const given = extractFirstNumber(rawAnswer)
  if (given === null) return null

  const tolerance = question.tolerance ?? 0.02
  const target = question.numericAnswer
  const relDiff = Math.abs(given - target) / Math.max(Math.abs(target), 1e-9)

  if (relDiff <= tolerance) return { score: 100, correctness: 'correct' }
  if (relDiff <= tolerance * 5) return { score: 50, correctness: 'partial' }
  return { score: 0, correctness: 'incorrect' }
}

function gradeMcq(question: Question, rawAnswer: string): { score: number; correctness: Correctness } {
  const chosen = Number(rawAnswer)
  const correct = Number.isFinite(chosen) && chosen === question.correctIndex
  return correct ? { score: 100, correctness: 'correct' } : { score: 0, correctness: 'incorrect' }
}

const RUBRIC_STOPWORDS = STOPWORDS

/** No-API-key fallback for open-ended grading: scores keyword/phrase overlap
 * between the answer and each rubric bullet's significant words. Cruder than
 * AI grading (it can't judge reasoning quality), but keeps the whole product
 * testable without a key, and is intentionally not generous. */
function heuristicRubricGrade(rubric: string[], answer: string): { score: number; correctness: Correctness; feedback: AttemptFeedback } {
  const answerTokens = new Set(tokenize(answer))
  let covered = 0
  const missingBits: string[] = []

  for (const bullet of rubric) {
    const bulletTokens = tokenize(bullet).filter((t) => !RUBRIC_STOPWORDS.has(t))
    if (bulletTokens.length === 0) continue
    const hit = bulletTokens.filter((t) => answerTokens.has(t)).length
    const coverage = hit / bulletTokens.length
    covered += coverage
    if (coverage < 0.5) missingBits.push(bullet)
  }

  const score = Math.round((covered / Math.max(rubric.length, 1)) * 100)
  const correctness = correctnessFromScore(score)

  return {
    score,
    correctness,
    feedback: {
      whatWasCorrect: correctness === 'incorrect' ? '' : 'Your answer touches on the key terms expected.',
      whatWasMissing: missingBits.length ? missingBits.join(' ') : '',
      whatWasWrong: answer.trim() ? '' : 'No answer was given.',
      improvementTip:
        'This was graded by simple keyword matching (no AI key set) - add an API key in Settings for real reasoning-based grading.',
    },
  }
}

export async function gradeAttempt(question: Question, rawAnswer: string, ctx: GradeContext): Promise<DraftAttempt> {
  const draft = baseDraft(question, rawAnswer, ctx)

  if (question.type === 'mcq') {
    const { score, correctness } = gradeMcq(question, rawAnswer)
    return {
      ...draft,
      score,
      correctness,
      gradedBy: 'mcq',
      feedback: {
        whatWasCorrect: correctness === 'correct' ? question.explanation : '',
        whatWasMissing: '',
        whatWasWrong: correctness === 'incorrect' ? question.explanation : '',
        improvementTip: correctness === 'incorrect' ? 'Review this concept and try a fresh question on it.' : '',
      },
    }
  }

  if (question.type === 'calculation') {
    const numeric = gradeCalculation(question, rawAnswer)
    if (numeric) {
      return {
        ...draft,
        score: numeric.score,
        correctness: numeric.correctness,
        gradedBy: 'deterministic',
        feedback: {
          whatWasCorrect: numeric.correctness !== 'incorrect' ? `Your number is within tolerance of ${question.correctAnswer}.` : '',
          whatWasMissing: '',
          whatWasWrong: numeric.correctness === 'incorrect' ? `Expected approximately ${question.correctAnswer}.` : '',
          improvementTip:
            numeric.correctness === 'incorrect'
              ? 'Re-check which formula applies and each step of the calculation.'
              : '',
        },
      }
    }
    // No parseable number - grade whatever reasoning was written instead.
  }

  if (ctx.claude?.apiKey) {
    try {
      const result = await gradeOpenResponse(question, rawAnswer, ctx.claude)
      return {
        ...draft,
        score: result.score,
        correctness: result.correctness,
        misconceptionTag: result.misconceptionTag,
        gradedBy: 'ai',
        feedback: {
          whatWasCorrect: result.whatWasCorrect,
          whatWasMissing: result.whatWasMissing,
          whatWasWrong: result.whatWasWrong,
          improvementTip: result.improvementTip,
        },
      }
    } catch {
      // Fall through to heuristic grading if the AI call fails for any reason.
    }
  }

  const heuristic = heuristicRubricGrade(question.rubric, rawAnswer)
  return { ...draft, score: heuristic.score, correctness: heuristic.correctness, gradedBy: 'heuristic', feedback: heuristic.feedback }
}
