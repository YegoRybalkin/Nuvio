import { HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { useAdaptiveGame } from '../../lib/useAdaptiveGame'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, Question } from '../../types'
import { GameEndScreen, LivesHud } from './GameHud'

const ROUNDS = 8

/** Doesn't label which concept/method a question is testing - the student
 * has to identify it first, training interleaving and method selection
 * rather than pattern-matching on a topic header. */
export default function Mystery({ pool, concepts, courseId, onExit }: { pool: Question[]; concepts: Concept[]; courseId: string; onExit: () => void }) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const [guess, setGuess] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [rounds, setRounds] = useState(0)
  const [over, setOver] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))
  const { state, accuracy, grading, lastAttempt, submit, advance } = useAdaptiveGame(pool, 2)

  useEffect(() => {
    if (!over && (rounds >= ROUNDS || (state.currentQuestion === null && state.questionsAttempted > 0))) setOver(true)
  }, [over, rounds, state.currentQuestion, state.questionsAttempted])

  useEffect(() => {
    if (!over || recorded) return
    setRecorded(true)
    recordGameSession({
      mode: 'mystery',
      courseId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      score: state.score,
      accuracy,
      highestStreak: state.streak,
      questionsAttempted: state.questionsAttempted,
      correct: state.correctCount,
      difficultyReached: state.difficultyReached,
      result: 'completed',
      weaknessesFound: state.weaknesses.map((cid) => conceptById.get(cid)?.name ?? cid),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, recorded])

  if (pool.length === 0) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough questions yet for Mystery Mode.</p>
  }

  if (over || !state.currentQuestion) {
    return (
      <GameEndScreen
        icon={<HelpCircle size={32} className="text-brand-400" />}
        title="Mystery Mode complete"
        stats={[
          { label: 'Score', value: state.score },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Rounds', value: rounds },
          { label: 'Difficulty reached', value: state.difficultyReached },
        ]}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const concept = conceptById.get(state.currentQuestion.conceptId)

  if (!revealed) {
    return (
      <div className="mx-auto max-w-xl">
        <LivesHud lives={3} maxLives={3} streak={state.streak} score={state.score} />
        <div className="rounded-2xl border border-white/10 bg-surface p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Mystery question {rounds + 1} / {ROUNDS}</p>
          <p className="font-display text-lg font-medium leading-snug text-ink">{state.currentQuestion.prompt}</p>
          <p className="mt-4 text-sm text-muted">Before answering: what concept or method do you think this is testing?</p>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Your guess…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Now solve it
          </button>
        </div>
      </div>
    )
  }

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    await submit(raw, confidence, hintsUsed, ms)
  }

  return (
    <div className="mx-auto max-w-xl">
      <LivesHud lives={3} maxLives={3} streak={state.streak} score={state.score} />
      {guess.trim() && (
        <p className="mb-3 rounded-xl bg-bg/40 p-3 text-xs text-muted">
          Your guess: <span className="text-ink">{guess}</span> · Actual concept revealed after you answer.
        </p>
      )}
      <QuestionCard
        key={state.currentQuestion.id}
        question={state.currentQuestion}
        concept={concept}
        hideConceptLabel={!lastAttempt}
        attempt={lastAttempt}
        grading={grading}
        onAnswer={handleAnswer}
        onNext={() => {
          setRevealed(false)
          setGuess('')
          setRounds((r) => r + 1)
          advance()
        }}
      />
    </div>
  )
}
