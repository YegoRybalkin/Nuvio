import { Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { useAdaptiveGame } from '../../lib/useAdaptiveGame'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, Question } from '../../types'
import { GameEndScreen, TimerHud } from './GameHud'

const DURATIONS = [60, 120, 300]

export default function SpeedRound({ pool, concepts, courseId, onExit }: { pool: Question[]; concepts: Concept[]; courseId: string; onExit: () => void }) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const [duration, setDuration] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [over, setOver] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))

  // Speed rounds are for quick recall/terminology, not multi-step calculations.
  const quickPool = pool.filter((q) => q.type !== 'calculation' && q.difficulty <= 3)
  const { state, accuracy, grading, lastAttempt, submit, advance } = useAdaptiveGame(quickPool, 1)

  useEffect(() => {
    if (duration === null || over) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setOver(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [duration, over])

  useEffect(() => {
    if (!over || recorded) return
    setRecorded(true)
    recordGameSession({
      mode: 'speed_round',
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

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    await submit(raw, confidence, hintsUsed, ms)
  }

  if (quickPool.length === 0) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough quick-recall questions yet for a speed round.</p>
  }

  if (duration === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Zap size={28} className="mx-auto mb-3 text-warn-400" />
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">Speed Round</h3>
        <div className="flex justify-center gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDuration(d)
                setSecondsLeft(d)
              }}
              className="rounded-xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              {d < 60 ? `${d}s` : `${d / 60}m`}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (over || !state.currentQuestion) {
    return (
      <GameEndScreen
        icon={<Zap size={32} className="text-warn-400" />}
        title="Time's up!"
        stats={[
          { label: 'Attempted', value: state.questionsAttempted },
          { label: 'Correct', value: state.correctCount },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Best streak', value: state.streak },
        ]}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <TimerHud secondsLeft={secondsLeft} score={state.score} correct={state.correctCount} />
      <QuestionCard
        key={state.currentQuestion.id}
        question={state.currentQuestion}
        concept={conceptById.get(state.currentQuestion.conceptId)}
        attempt={lastAttempt}
        grading={grading}
        onAnswer={handleAnswer}
        onNext={advance}
      />
    </div>
  )
}
