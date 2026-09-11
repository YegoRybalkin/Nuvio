import { motion } from 'framer-motion'
import { Check, PartyPopper, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { celebrateBig } from '../../lib/confetti'
import { useStudyStore } from '../../store/useStudyStore'
import type { QuizQuestion } from '../../types'

interface Answer {
  questionId: string
  chosenIndex: number
  correct: boolean
}

export default function QuizRunner({
  setId,
  questions,
  onDone,
}: {
  setId: string
  questions: QuizQuestion[]
  onDone?: () => void
}) {
  const recordQuizAttempt = useStudyStore((s) => s.recordQuizAttempt)
  const [order] = useState(() => questions)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const recordedRef = useRef(false)

  const question = order[index]
  const finished = index >= order.length

  useEffect(() => {
    if (!finished || recordedRef.current) return
    recordedRef.current = true
    const score = answers.filter((a) => a.correct).length
    const pct = score / Math.max(order.length, 1)
    const xpEarned = score * 5 + (pct >= 0.8 ? 20 : 0)
    recordQuizAttempt(setId, { completedAt: Date.now(), score, total: order.length }, xpEarned)
    if (pct >= 0.8) celebrateBig()
    // Runs once per completed quiz; `answers`/`order` are stable by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (order.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-muted">
        Not enough source text to build a quiz yet — add more content on the home page.
      </p>
    )
  }

  if (finished) {
    const score = answers.filter((a) => a.correct).length
    const pct = Math.round((score / order.length) * 100)
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-10 text-center">
        <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
        <h3 className="font-display text-xl font-semibold text-ink">
          {score} / {order.length} correct
        </h3>
        <p className="mt-1 text-sm text-muted">{pct}% · {scoreMessage(pct)}</p>
        <button
          type="button"
          onClick={onDone ?? (() => window.location.reload())}
          className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
        >
          Back to overview
        </button>
      </div>
    )
  }

  const handleSelect = (choiceIndex: number) => {
    if (selected !== null) return
    setSelected(choiceIndex)
    const correct = choiceIndex === question.correctIndex
    setAnswers((a) => [...a, { questionId: question.id, chosenIndex: choiceIndex, correct }])
  }

  const handleNext = () => {
    setSelected(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          Question {index + 1} of {order.length}
        </span>
        <span>{answers.filter((a) => a.correct).length} correct so far</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
          animate={{ width: `${(index / order.length) * 100}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-2xl border border-white/10 bg-surface p-6"
      >
        <p className="font-display text-lg font-medium leading-snug text-ink">{question.prompt}</p>

        <div className="mt-5 flex flex-col gap-2.5">
          {question.choices.map((choice, i) => {
            const isCorrect = i === question.correctIndex
            const isChosen = i === selected
            let stateClass = 'border-white/10 bg-bg/40 hover:border-brand-500/40'
            if (selected !== null) {
              if (isCorrect) stateClass = 'border-accent-500/50 bg-accent-500/10 text-accent-400'
              else if (isChosen) stateClass = 'border-danger-400/50 bg-danger-400/10 text-danger-400'
              else stateClass = 'border-white/5 bg-bg/20 opacity-60'
            }
            return (
              <button
                key={i}
                type="button"
                disabled={selected !== null}
                onClick={() => handleSelect(i)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium text-ink transition ${stateClass}`}
              >
                {choice}
                {selected !== null && isCorrect && <Check size={16} />}
                {selected !== null && isChosen && !isCorrect && <X size={16} />}
              </button>
            )
          })}
        </div>

        {selected !== null && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-muted">{question.explanation}</p>
            <button
              type="button"
              onClick={handleNext}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {index + 1 === order.length ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function scoreMessage(pct: number): string {
  if (pct === 100) return 'Perfect score!'
  if (pct >= 80) return 'Great work.'
  if (pct >= 50) return 'Good start — review the missed cards and try again.'
  return "Keep at it — try the flashcards again before a re-quiz."
}
