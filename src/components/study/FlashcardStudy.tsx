import { motion } from 'framer-motion'
import { PartyPopper, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { celebrate, celebrateBig } from '../../lib/confetti'
import { isDue } from '../../lib/srs'
import { useStudyStore } from '../../store/useStudyStore'
import type { Flashcard, Grade } from '../../types'

const GRADE_BUTTONS: { grade: Grade; label: string; hint: string; className: string }[] = [
  { grade: 'again', label: 'Again', hint: '<1m', className: 'bg-danger-400/15 text-danger-400 hover:bg-danger-400/25' },
  { grade: 'hard', label: 'Hard', hint: '~1d', className: 'bg-warn-400/15 text-warn-400 hover:bg-warn-400/25' },
  { grade: 'good', label: 'Good', hint: '~3d', className: 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25' },
  { grade: 'easy', label: 'Easy', hint: '~6d+', className: 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25' },
]

export default function FlashcardStudy({
  setId,
  cards,
  onDone,
}: {
  setId: string
  cards: Flashcard[]
  onDone?: () => void
}) {
  const gradeFlashcard = useStudyStore((s) => s.gradeFlashcard)
  const due = useMemo(() => cards.filter((c) => isDue(c.srs)), [cards])
  const [studyAhead, setStudyAhead] = useState(false)
  const [queue, setQueue] = useState<string[]>(() => due.map((c) => c.id))
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const currentId = queue[0]
  const current = currentId ? cardMap.get(currentId) : undefined
  const totalThisSession = reviewed + queue.length

  if (queue.length === 0 && reviewed === 0 && !studyAhead) {
    return (
      <EmptyDueState
        onStudyAhead={() => {
          setStudyAhead(true)
          setQueue(cards.slice(0, 15).map((c) => c.id))
        }}
      />
    )
  }

  if (!current) {
    return <SessionComplete count={reviewed} onRestart={onDone ?? (() => window.location.reload())} />
  }

  const handleGrade = (grade: Grade) => {
    gradeFlashcard(setId, current.id, grade)
    setFlipped(false)
    setQueue((q) => {
      const rest = q.slice(1)
      // "Again" puts the card back later in this same session for re-drilling.
      return grade === 'again' ? [...rest, current.id] : rest
    })
    setReviewed((n) => n + 1)
    if ((reviewed + 1) % 10 === 0) celebrate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar current={reviewed} total={Math.max(totalThisSession, 1)} />

      <div
        className={`flip-card mt-6 h-72 cursor-pointer select-none ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="flip-card-inner relative h-full w-full">
          <div className="flip-card-face absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-white/10 bg-surface p-8 text-center shadow-xl scrollbar-thin">
            <span className="mb-3 shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              {current.cloze ? 'Fill in the blank' : 'Question'}
            </span>
            <p className="font-display text-lg font-semibold leading-snug text-ink">{current.front}</p>
            <span className="mt-6 flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <RotateCw size={13} /> Tap to reveal
            </span>
          </div>
          <div className="flip-card-face flip-card-back absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-brand-500/30 bg-surface-2 p-8 text-center shadow-xl scrollbar-thin">
            <span className="mb-3 shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              Answer
            </span>
            <p className="font-display text-base font-medium leading-relaxed text-accent-400">{current.back}</p>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((b) => (
            <button
              key={b.grade}
              type="button"
              onClick={() => handleGrade(b.grade)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-sm font-semibold transition ${b.className}`}
            >
              {b.label}
              <span className="text-[10px] font-normal opacity-80">{b.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="mt-6 w-full rounded-xl bg-white/5 py-3 text-sm font-semibold text-ink transition hover:bg-white/10"
        >
          Show answer
        </button>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        {queue.length} card{queue.length === 1 ? '' : 's'} left this session
        {studyAhead && ' · studying ahead'}
      </p>
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
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

function EmptyDueState({ onStudyAhead }: { onStudyAhead: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-surface p-10 text-center">
      <PartyPopper size={32} className="mx-auto mb-3 text-accent-400" />
      <h3 className="font-display text-lg font-semibold text-ink">All caught up!</h3>
      <p className="mt-1 text-sm text-muted">
        No cards are due right now — the spaced-repetition schedule is doing its job. Come back
        later, or study ahead if you want extra reps.
      </p>
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

function SessionComplete({ count, onRestart }: { count: number; onRestart: () => void }) {
  useEffect(() => celebrateBig(), [])
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-10 text-center">
      <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
      <h3 className="font-display text-lg font-semibold text-ink">Session complete</h3>
      <p className="mt-1 text-sm text-muted">You reviewed {count} cards. Nice work.</p>
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

