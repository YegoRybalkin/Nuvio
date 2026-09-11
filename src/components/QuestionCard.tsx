import { Check, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { IMPORTANCE_CLASS, IMPORTANCE_LABEL } from '../lib/importance'
import type { Concept, Confidence, Question, QuestionAttempt } from '../types'

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Recall',
  2: 'Understanding',
  3: 'Application',
  4: 'Analysis',
  5: 'Transfer',
}

const CONFIDENCE_OPTIONS: { id: Confidence; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
]

export interface QuestionCardProps {
  question: Question
  concept?: Concept
  askConfidence?: boolean
  hideConceptLabel?: boolean
  attempt: QuestionAttempt | null
  onAnswer: (answer: string, confidence: Confidence | undefined, hintsUsed: number, responseTimeMs: number) => void
  onNext?: () => void
  grading?: boolean
}

export default function QuestionCard({
  question,
  concept,
  askConfidence,
  hideConceptLabel,
  attempt,
  onAnswer,
  onNext,
  grading,
}: QuestionCardProps) {
  const [text, setText] = useState('')
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<Confidence | undefined>(undefined)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintsShown, setHintsShown] = useState<string[]>([])
  const [startedAt] = useState(() => Date.now())

  const answered = attempt !== null
  const canSubmit = question.type === 'mcq' ? choiceIndex !== null : text.trim().length > 0

  const requestHint = () => {
    const next = question.rubric[hintsShown.length]
    if (next) setHintsShown((h) => [...h, next])
    setHintsUsed((h) => h + 1)
  }

  const submit = () => {
    if (!canSubmit || answered) return
    const raw = question.type === 'mcq' ? String(choiceIndex) : text
    onAnswer(raw, askConfidence ? confidence : undefined, hintsUsed, Date.now() - startedAt)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {!hideConceptLabel && concept && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted">{concept.name}</span>
        )}
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted">
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
        {concept?.importance && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${IMPORTANCE_CLASS[concept.importance]}`}>
            {IMPORTANCE_LABEL[concept.importance]}
          </span>
        )}
      </div>

      <p className="font-display text-lg font-medium leading-snug text-ink">{question.prompt}</p>

      {hintsShown.length > 0 && !answered && (
        <div className="mt-3 space-y-1.5">
          {hintsShown.map((hint, i) => (
            <p key={i} className="flex items-start gap-1.5 rounded-lg bg-warn-400/10 p-2.5 text-xs text-warn-400">
              <Lightbulb size={13} className="mt-0.5 shrink-0" />
              {hint}
            </p>
          ))}
        </div>
      )}

      {question.type === 'mcq' && question.choices ? (
        <div className="mt-4 flex flex-col gap-2.5">
          {question.choices.map((choice, i) => {
            const isCorrect = i === question.correctIndex
            const isChosen = i === choiceIndex
            let stateClass = 'border-white/10 bg-bg/40 hover:border-brand-500/40'
            if (answered) {
              if (isCorrect) stateClass = 'border-accent-500/50 bg-accent-500/10 text-accent-400'
              else if (isChosen) stateClass = 'border-danger-400/50 bg-danger-400/10 text-danger-400'
              else stateClass = 'border-white/5 bg-bg/20 opacity-60'
            } else if (isChosen) {
              stateClass = 'border-brand-500 bg-brand-500/10 text-ink'
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => setChoiceIndex(i)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium text-ink transition ${stateClass}`}
              >
                {choice}
                {answered && isCorrect && <Check size={16} />}
                {answered && isChosen && !isCorrect && <X size={16} />}
              </button>
            )
          })}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={answered}
          placeholder={question.type === 'calculation' ? 'Enter your final numeric answer (show work if you like)…' : 'Type your answer…'}
          rows={question.type === 'calculation' ? 2 : 4}
          className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-bg/60 p-3 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none disabled:opacity-70"
        />
      )}

      {!answered && askConfidence && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted">How confident are you?</span>
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setConfidence(opt.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                confidence === opt.id ? 'bg-brand-500 text-white' : 'bg-white/5 text-muted hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {!answered && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || grading || (askConfidence && !confidence)}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {grading ? 'Grading…' : 'Submit answer'}
          </button>
          {question.rubric.length > hintsShown.length && (
            <button
              type="button"
              onClick={requestHint}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              <Lightbulb size={15} />
              Hint
            </button>
          )}
        </div>
      )}

      {answered && attempt && (
        <div className="mt-4 rounded-xl border border-white/10 bg-bg/40 p-4">
          <p
            className={`mb-2 text-sm font-semibold ${
              attempt.correctness === 'correct'
                ? 'text-accent-400'
                : attempt.correctness === 'partial'
                  ? 'text-warn-400'
                  : 'text-danger-400'
            }`}
          >
            {attempt.correctness === 'correct' ? 'Correct' : attempt.correctness === 'partial' ? 'Partially correct' : 'Incorrect'}
            {' · '}
            {attempt.score}/100
          </p>
          {attempt.feedback.whatWasCorrect && <p className="text-sm text-muted">{attempt.feedback.whatWasCorrect}</p>}
          {attempt.feedback.whatWasMissing && (
            <p className="mt-1 text-sm text-warn-400">Missing: {attempt.feedback.whatWasMissing}</p>
          )}
          {attempt.feedback.whatWasWrong && <p className="mt-1 text-sm text-danger-400">{attempt.feedback.whatWasWrong}</p>}
          {attempt.feedback.improvementTip && <p className="mt-2 text-xs text-muted">Tip: {attempt.feedback.improvementTip}</p>}
          {attempt.correctness !== 'correct' && (
            <p className="mt-2 text-xs text-ink">
              <span className="font-semibold">Model answer: </span>
              {question.correctAnswer}
            </p>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  )
}
