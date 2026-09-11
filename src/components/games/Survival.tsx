import { Skull } from 'lucide-react'
import { useEffect, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { useAdaptiveGame } from '../../lib/useAdaptiveGame'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, GameMode, Question } from '../../types'
import { GameEndScreen, LivesHud } from './GameHud'

const MAX_LIVES = 3

export default function Survival({
  pool,
  concepts,
  courseId,
  onExit,
  mode = 'survival',
  title = 'Survival Mode',
}: {
  pool: Question[]
  concepts: Concept[]
  courseId: string
  onExit: () => void
  mode?: GameMode
  title?: string
}) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const [lives, setLives] = useState(MAX_LIVES)
  const [over, setOver] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const { state, accuracy, grading, lastAttempt, submit, advance } = useAdaptiveGame(pool, 1)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))

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
      result: lives <= 0 ? 'lost' : 'completed',
      weaknessesFound: state.weaknesses.map((cid) => conceptById.get(cid)?.name ?? cid),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, recorded])

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    const attempt = await submit(raw, confidence, hintsUsed, ms)
    if (attempt && attempt.correctness !== 'correct') {
      setLives((l) => Math.max(0, l - 1))
    }
  }

  const handleNext = () => {
    if (lives <= 0) {
      setOver(true)
      return
    }
    advance()
  }

  if (pool.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-muted">
        Not enough questions in this course yet to play {title}.
      </p>
    )
  }

  if (over || lives <= 0 || !state.currentQuestion) {
    return (
      <GameEndScreen
        icon={<Skull size={32} className="text-danger-400" />}
        title={lives <= 0 ? 'Game over' : `${title} complete`}
        stats={[
          { label: 'Score', value: state.score },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Best streak', value: state.streak },
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
      <LivesHud lives={lives} maxLives={MAX_LIVES} streak={state.streak} score={state.score} />
      <QuestionCard
        key={state.currentQuestion.id}
        question={state.currentQuestion}
        concept={conceptById.get(state.currentQuestion.conceptId)}
        attempt={lastAttempt}
        grading={grading}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />
    </div>
  )
}
