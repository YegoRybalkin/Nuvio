import { Check, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { celebrate } from '../../lib/confetti'
import { IMPORTANCE_CLASS, IMPORTANCE_LABEL } from '../../lib/importance'
import { isDue } from '../../lib/srs'
import { useStudyStore } from '../../store/useStudyStore'
import type { Flashcard, Grade } from '../../types'
import { EmptyDueState, ProgressBar, SessionComplete } from './SessionUi'

const GRADE_BUTTONS: { grade: Grade; label: string; hint: string; className: string }[] = [
  { grade: 'again', label: 'Again', hint: '<1m', className: 'bg-danger-400/15 text-danger-400 hover:bg-danger-400/25' },
  { grade: 'hard', label: 'Hard', hint: '~1d', className: 'bg-warn-400/15 text-warn-400 hover:bg-warn-400/25' },
  { grade: 'good', label: 'Good', hint: '~3d', className: 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25' },
  { grade: 'easy', label: 'Easy', hint: '~6d+', className: 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25' },
]

/** Forces active production before revealing the answer: typing what you
 * remember, unprompted, is a stronger retrieval-practice signal than
 * recognizing the right answer in a flipped card or a multiple-choice list. */
export default function TypedRecall({
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
  const [draft, setDraft] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const currentId = queue[0]
  const current = currentId ? cardMap.get(currentId) : undefined
  const totalThisSession = reviewed + queue.length

  if (queue.length === 0 && reviewed === 0 && !studyAhead) {
    return (
      <EmptyDueState
        message="No cards are due for recall practice right now. Come back later, or practice ahead if you want extra reps."
        onStudyAhead={() => {
          setStudyAhead(true)
          setQueue(cards.slice(0, 15).map((c) => c.id))
        }}
      />
    )
  }

  if (!current) {
    return (
      <SessionComplete count={reviewed} noun="cards" onRestart={onDone ?? (() => window.location.reload())} />
    )
  }

  const reveal = () => setRevealed(true)

  const handleGrade = (grade: Grade) => {
    gradeFlashcard(setId, current.id, grade)
    setRevealed(false)
    setDraft('')
    setQueue((q) => {
      const rest = q.slice(1)
      return grade === 'again' ? [...rest, current.id] : rest
    })
    setReviewed((n) => n + 1)
    if ((reviewed + 1) % 10 === 0) celebrate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar current={reviewed} total={Math.max(totalThisSession, 1)} />

      <div className="mt-6 rounded-3xl border border-white/10 bg-surface p-8">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            {current.cloze ? 'Fill in the blank' : 'Question'}
          </span>
          {current.importance && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${IMPORTANCE_CLASS[current.importance]}`}
            >
              {IMPORTANCE_LABEL[current.importance]}
            </span>
          )}
        </div>
        <p className="font-display text-lg font-semibold leading-snug text-ink">{current.front}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!revealed) reveal()
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={revealed}
            placeholder="Type what you remember, then check your answer…"
            rows={3}
            className="mt-5 w-full resize-none rounded-xl border border-white/10 bg-bg/60 p-3 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none disabled:opacity-70"
          />
          {!revealed && (
            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Send size={15} />
              Check answer
            </button>
          )}
        </form>

        {revealed && (
          <div className="mt-4 rounded-xl border border-brand-500/30 bg-surface-2 p-4">
            <span className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <Check size={13} /> Correct answer
            </span>
            <p className="font-display text-base font-medium leading-relaxed text-accent-400">{current.back}</p>
          </div>
        )}
      </div>

      {revealed ? (
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
        <p className="mt-4 text-center text-xs text-muted">
          Grade yourself honestly against the correct answer once it's revealed.
        </p>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        {queue.length} card{queue.length === 1 ? '' : 's'} left this session
        {studyAhead && ' · practicing ahead'}
      </p>
    </div>
  )
}
