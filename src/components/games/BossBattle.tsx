import { useEffect, useMemo, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { damageForDifficulty } from '../../lib/gameLogic'
import { useAdaptiveGame } from '../../lib/useAdaptiveGame'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, GameMode, Question } from '../../types'
import { GameEndScreen, HealthHud } from './GameHud'

const MAX_HEALTH = 100
const FINAL_STAGE_THRESHOLD = 20

export default function BossBattle({
  pool,
  concepts,
  courseId,
  bossName,
  onExit,
  mode = 'boss_battle',
}: {
  pool: Question[]
  concepts: Concept[]
  courseId: string
  bossName: string
  onExit: () => void
  mode?: GameMode
}) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const [health, setHealth] = useState(MAX_HEALTH)
  const [over, setOver] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))

  // Once the boss is nearly down, the final blow must come from a hard,
  // exam-style question - it can't be farmed down with easy ones.
  const effectivePool = useMemo(() => (health <= FINAL_STAGE_THRESHOLD ? pool.filter((q) => q.difficulty >= 4) : pool), [pool, health])
  const { state, accuracy, grading, lastAttempt, submit, advance } = useAdaptiveGame(effectivePool, 2)

  useEffect(() => {
    if (!over && state.currentQuestion === null && state.questionsAttempted > 0) setOver(true)
  }, [over, state.currentQuestion, state.questionsAttempted])

  useEffect(() => {
    if (!over || recorded) return
    setRecorded(true)
    recordGameSession({
      mode,
      courseId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      score: state.score,
      accuracy,
      highestStreak: state.streak,
      questionsAttempted: state.questionsAttempted,
      correct: state.correctCount,
      difficultyReached: state.difficultyReached,
      result: health <= 0 ? 'won' : 'completed',
      weaknessesFound: state.weaknesses.map((cid) => conceptById.get(cid)?.name ?? cid),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, recorded])

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    if (!state.currentQuestion) return
    const attempt = await submit(raw, confidence, hintsUsed, ms)
    if (attempt?.correctness === 'correct') {
      const damage = damageForDifficulty(state.currentQuestion.difficulty)
      setHealth((h) => Math.max(0, h - damage))
    }
  }

  if (pool.length === 0) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough questions yet to fight this boss.</p>
  }

  if (over || health <= 0 || !state.currentQuestion) {
    return (
      <GameEndScreen
        icon={<span className="text-3xl">{health <= 0 ? '🏆' : '🛡️'}</span>}
        title={health <= 0 ? `${bossName} defeated!` : 'Battle ended'}
        stats={[
          { label: 'Score', value: state.score },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Boss health left', value: `${health}%` },
          { label: 'Difficulty reached', value: state.difficultyReached },
        ]}
        weaknessNames={state.weaknesses.map((cid) => conceptById.get(cid)?.name ?? cid)}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <HealthHud health={health} maxHealth={MAX_HEALTH} label={bossName} streak={state.streak} score={state.score} />
      {health <= FINAL_STAGE_THRESHOLD && health > 0 && (
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-danger-400">Final stage - boss question</p>
      )}
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
