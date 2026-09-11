import { Calculator } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { useAnswerQuestion } from '../../lib/useAnswerQuestion'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, DifficultyLevel, Question } from '../../types'
import { GameEndScreen } from './GameHud'

const ROUND_LABELS = ['Round 1 - Simple problem', 'Round 2 - Harder, same idea', 'Round 3 - Method selection', 'Round 4 - Mixed concepts', 'Round 5 - Exam-level, unfamiliar']
const ROUND_DIFFICULTY: DifficultyLevel[] = [1, 2, 3, 4, 5]

function pickForRound(pool: Question[], round: number, usedIds: Set<string>): Question | null {
  const targetDiff = ROUND_DIFFICULTY[round]
  const preferMethod = round === 2
  const candidates = pool.filter((q) => !usedIds.has(q.id) && (preferMethod ? q.type === 'identify_method' || q.type === 'calculation' : true))
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => Math.abs(a.difficulty - targetDiff) - Math.abs(b.difficulty - targetDiff))[0]
}

export default function CalculationArena({ pool, concepts, courseId, onExit }: { pool: Question[]; concepts: Concept[]; courseId: string; onExit: () => void }) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const calcPool = useMemo(() => pool.filter((q) => q.type === 'calculation' || q.type === 'identify_method'), [pool])
  const [round, setRound] = useState(0)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState<Question | null>(() => pickForRound(calcPool, 0, new Set()))
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [recorded, setRecorded] = useState(false)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))
  const { grading, lastAttempt, answer, reset } = useAnswerQuestion('game')

  const finished = round >= ROUND_LABELS.length || current === null

  useEffect(() => {
    if (!finished || recorded) return
    setRecorded(true)
    recordGameSession({
      mode: 'calculation_arena',
      courseId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      score,
      accuracy: round ? Math.round((correctCount / round) * 100) : 0,
      highestStreak: correctCount,
      questionsAttempted: round,
      correct: correctCount,
      difficultyReached: ROUND_DIFFICULTY[Math.min(round, 4)],
      result: 'completed',
      weaknessesFound: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, recorded])

  if (calcPool.length === 0) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough calculation questions yet for the Calculation Arena.</p>
  }

  if (finished) {
    return (
      <GameEndScreen
        icon={<Calculator size={32} className="text-brand-400" />}
        title="Arena complete"
        stats={[
          { label: 'Rounds cleared', value: round },
          { label: 'Correct', value: correctCount },
          { label: 'Score', value: score },
        ]}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    if (!current) return
    const attempt = await answer(current, raw, confidence, hintsUsed, ms)
    if (attempt.correctness === 'correct') {
      setScore((s) => s + current.difficulty * 20 - hintsUsed * 5)
      setCorrectCount((c) => c + 1)
    }
  }

  const handleNext = () => {
    reset()
    const nextUsed = new Set(used)
    if (current) nextUsed.add(current.id)
    setUsed(nextUsed)
    const nextRound = round + 1
    setRound(nextRound)
    setCurrent(nextRound < ROUND_LABELS.length ? pickForRound(calcPool, nextRound, nextUsed) : null)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{ROUND_LABELS[round]}</span>
        <span className="text-muted">{score} pts</span>
      </div>
      <QuestionCard
        key={current!.id}
        question={current!}
        concept={conceptById.get(current!.conceptId)}
        attempt={lastAttempt}
        grading={grading}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />
    </div>
  )
}
