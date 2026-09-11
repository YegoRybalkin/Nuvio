import { motion } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import { useEffect } from 'react'
import { celebrateBig } from '../../lib/confetti'

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.round((current / total) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
        animate={{ width: `${pct}%` }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
      />
    </div>
  )
}

export function EmptyDueState({
  onStudyAhead,
  message = "No cards are due right now — the spaced-repetition schedule is doing its job. Come back later, or study ahead if you want extra reps.",
}: {
  onStudyAhead: () => void
  message?: string
}) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-surface p-10 text-center">
      <PartyPopper size={32} className="mx-auto mb-3 text-accent-400" />
      <h3 className="font-display text-lg font-semibold text-ink">All caught up!</h3>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onStudyAhead}
        className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
      >
        Study ahead anyway
      </button>
    </div>
  )
}

export function SessionComplete({
  count,
  noun = 'cards',
  onRestart,
}: {
  count: number
  noun?: string
  onRestart: () => void
}) {
  useEffect(() => celebrateBig(), [])
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-10 text-center">
      <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
      <h3 className="font-display text-lg font-semibold text-ink">Session complete</h3>
      <p className="mt-1 text-sm text-muted">
        You reviewed {count} {noun}. Nice work.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
      >
        Back to overview
      </button>
    </div>
  )
}
