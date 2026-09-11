import { PartyPopper } from 'lucide-react'
import { useMemo, useState } from 'react'
import QuestionCard from './QuestionCard'
import { celebrateBig } from '../lib/confetti'
import { useAnswerQuestion } from '../lib/useAnswerQuestion'
import type { Concept, Confidence, Question, QuestionAttempt } from '../types'

export interface QuestionQueueRunnerProps {
  questions: Question[]
  concepts: Concept[]
  source: QuestionAttempt['source']
  askConfidence?: boolean
  hideConceptLabel?: boolean
  completionLabel?: string
  onComplete?: (attempts: QuestionAttempt[]) => void
  onAttempt?: (attempt: QuestionAttempt) => void
  onExit?: () => void
}

export default function QuestionQueueRunner({
  questions,
  concepts,
  source,
  askConfidence,
  hideConceptLabel,
  completionLabel = 'Session complete',
  onComplete,
  onAttempt,
  onExit,
}: QuestionQueueRunnerProps) {
  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([])
  const { grading, lastAttempt, answer, reset } = useAnswerQuestion(source)
  const conceptById = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts])

  const question = questions[index]
  const finished = index >= questions.length

  if (questions.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-muted">
        No questions available for this yet - add material with more content, or check back once concepts are due.
      </p>
    )
  }

  if (finished) {
    const correct = attempts.filter((a) => a.correctness === 'correct').length
    const pct = Math.round((correct / attempts.length) * 100)
    if (pct >= 80) celebrateBig()
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-10 text-center">
        <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
        <h3 className="font-display text-lg font-semibold text-ink">{completionLabel}</h3>
        <p className="mt-1 text-sm text-muted">
          {correct} / {attempts.length} correct ({pct}%)
        </p>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            Done
          </button>
        )}
      </div>
    )
  }

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, responseTimeMs: number) => {
    const attempt = await answer(question, raw, confidence, hintsUsed, responseTimeMs)
    setAttempts((a) => [...a, attempt])
    onAttempt?.(attempt)
  }

  const handleNext = () => {
    reset()
    const next = index + 1
    setIndex(next)
    if (next >= questions.length) onComplete?.(attempts)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>{attempts.filter((a) => a.correctness === 'correct').length} correct so far</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-300"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <div className="mt-6">
        <QuestionCard
          key={question.id}
          question={question}
          concept={conceptById.get(question.conceptId)}
          askConfidence={askConfidence}
          hideConceptLabel={hideConceptLabel}
          attempt={lastAttempt}
          grading={grading}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </div>
    </div>
  )
}
