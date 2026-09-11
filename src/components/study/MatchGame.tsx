import { LayoutGrid, RotateCcw, Timer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { celebrate, celebrateBig } from '../../lib/confetti'
import type { MatchPair } from '../../lib/matchPairs'
import { useStudyStore } from '../../store/useStudyStore'

const ROUND_SIZE = 8
const MIN_PAIRS = 4

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

interface Selection {
  side: 'term' | 'def'
  pairId: string
}

/** A timed matching game: click a term, then its definition, to pair them up.
 * Forces short, atomic recall of terms and their core meaning - the fastest
 * way to lock in vocabulary, and a genuinely different mode from flashcards. */
export default function MatchGame({
  setId,
  pairs,
  onDone,
}: {
  setId: string
  pairs: MatchPair[]
  onDone?: () => void
}) {
  const recordMatchAttempt = useStudyStore((s) => s.recordMatchAttempt)
  const [round, setRound] = useState(0)
  const roundPairs = useMemo(() => pairs.slice(0, ROUND_SIZE), [pairs])

  const [terms, setTerms] = useState(() => shuffle(roundPairs))
  const [defs, setDefs] = useState(() => shuffle(roundPairs))
  const [selected, setSelected] = useState<Selection | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [mistake, setMistake] = useState<{ term: string; def: string } | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [startTime, setStartTime] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [recorded, setRecorded] = useState(false)

  useEffect(() => {
    setTerms(shuffle(roundPairs))
    setDefs(shuffle(roundPairs))
    setSelected(null)
    setMatched(new Set())
    setMistakes(0)
    setStartTime(Date.now())
    setElapsed(0)
    setRecorded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const complete = roundPairs.length > 0 && matched.size === roundPairs.length

  useEffect(() => {
    if (complete) return
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [complete, startTime])

  useEffect(() => {
    if (!complete || recorded) return
    setRecorded(true)
    const xpEarned = 10 + roundPairs.length + Math.max(0, 5 - mistakes) * 2
    recordMatchAttempt(setId, { completedAt: Date.now(), pairs: roundPairs.length, seconds: elapsed, mistakes }, xpEarned)
    celebrateBig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, recorded])

  if (pairs.length < MIN_PAIRS) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-surface p-10 text-center">
        <LayoutGrid size={32} className="mx-auto mb-3 text-muted" />
        <h3 className="font-display text-lg font-semibold text-ink">Not enough short terms yet</h3>
        <p className="mt-1 text-sm text-muted">
          The matching game needs at least {MIN_PAIRS} short term/definition pairs. Try a study set
          with more key concepts, or use Learn/Recall mode for this one.
        </p>
      </div>
    )
  }

  const handleSelect = (side: 'term' | 'def', pairId: string) => {
    if (matched.has(pairId) || mistake) return

    if (!selected) {
      setSelected({ side, pairId })
      return
    }
    if (selected.side === side) {
      setSelected(selected.pairId === pairId ? null : { side, pairId })
      return
    }
    // Comparing a term selection against a def selection (or vice versa).
    const termId = side === 'term' ? pairId : selected.pairId
    const defId = side === 'def' ? pairId : selected.pairId
    if (termId === defId) {
      setMatched((m) => new Set(m).add(termId))
      setSelected(null)
      if ((matched.size + 1) % 3 === 0) celebrate()
    } else {
      setMistake({ term: termId, def: defId })
      setMistakes((n) => n + 1)
      setTimeout(() => {
        setMistake(null)
        setSelected(null)
      }, 500)
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  if (complete) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-10 text-center">
        <LayoutGrid size={32} className="mx-auto mb-3 text-brand-400" />
        <h3 className="font-display text-lg font-semibold text-ink">Round complete!</h3>
        <p className="mt-1 text-sm text-muted">
          {roundPairs.length} pairs in {mm}:{ss}
          {mistakes > 0 && ` · ${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <RotateCcw size={15} />
            Play again
          </button>
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              Back to overview
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>
          {matched.size} / {roundPairs.length} matched
        </span>
        <span className="flex items-center gap-1.5">
          <Timer size={14} />
          {mm}:{ss}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {terms.map((p) => (
            <MatchTile
              key={`term-${p.id}`}
              text={p.term}
              isMatched={matched.has(p.id)}
              isSelected={selected?.side === 'term' && selected.pairId === p.id}
              isMistake={mistake?.term === p.id}
              onClick={() => handleSelect('term', p.id)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {defs.map((p) => (
            <MatchTile
              key={`def-${p.id}`}
              text={p.definition}
              isMatched={matched.has(p.id)}
              isSelected={selected?.side === 'def' && selected.pairId === p.id}
              isMistake={mistake?.def === p.id}
              onClick={() => handleSelect('def', p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchTile({
  text,
  isMatched,
  isSelected,
  isMistake,
  onClick,
}: {
  text: string
  isMatched: boolean
  isSelected: boolean
  isMistake: boolean
  onClick: () => void
}) {
  let stateClass = 'border-white/10 bg-surface hover:border-brand-500/40'
  if (isMatched) stateClass = 'border-accent-500/40 bg-accent-500/10 text-accent-400 opacity-50'
  else if (isMistake) stateClass = 'border-danger-400/60 bg-danger-400/10 text-danger-400 animate-shake'
  else if (isSelected) stateClass = 'border-brand-500 bg-brand-500/10 text-ink'

  return (
    <button
      type="button"
      disabled={isMatched}
      onClick={onClick}
      className={`min-h-14 rounded-xl border px-3 py-2.5 text-left text-sm font-medium leading-snug transition ${stateClass}`}
    >
      {text}
    </button>
  )
}
