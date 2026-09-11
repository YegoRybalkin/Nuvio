import { Swords, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { OPPONENT_LABELS, simulateOpponentAnswer } from '../../lib/gameLogic'
import { useAnswerQuestion } from '../../lib/useAnswerQuestion'
import type { AiOpponentLevel, Concept, Confidence, Question } from '../../types'
import { useCourseStore } from '../../store/useCourseStore'
import { GameEndScreen } from './GameHud'

const ROUNDS = 8
const LEVELS: AiOpponentLevel[] = ['rookie', 'student', 'expert', 'professor']

export default function KnowledgeDuel({ pool, concepts, courseId, onExit }: { pool: Question[]; concepts: Concept[]; courseId: string; onExit: () => void }) {
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const [level, setLevel] = useState<AiOpponentLevel | null>(null)
  const [index, setIndex] = useState(0)
  const [youScore, setYouScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [recorded, setRecorded] = useState(false)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))
  const { grading, lastAttempt, answer, reset } = useAnswerQuestion('game')

  const rounds = useMemo(() => [...pool].sort(() => Math.random() - 0.5).slice(0, ROUNDS), [pool])
  const finished = level !== null && index >= rounds.length

  useEffect(() => {
    if (!finished || recorded || level === null) return
    setRecorded(true)
    recordGameSession({
      mode: 'knowledge_duel',
      courseId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      score: youScore,
      accuracy: 0,
      highestStreak: 0,
      questionsAttempted: rounds.length,
      correct: 0,
      difficultyReached: 3,
      result: youScore >= aiScore ? 'won' : 'lost',
      weaknessesFound: [],
      opponentLevel: level,
      opponentScore: aiScore,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, recorded, level])

  if (rounds.length < 4) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough questions yet for a Knowledge Duel.</p>
  }

  if (level === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Swords size={28} className="mx-auto mb-3 text-brand-400" />
        <h3 className="mb-4 font-display text-lg font-semibold text-ink">Choose your opponent</h3>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className="rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              {OPPONENT_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (finished) {
    const won = youScore > aiScore
    return (
      <GameEndScreen
        icon={<span className="text-3xl">{won ? '🏆' : '🤝'}</span>}
        title={won ? 'You win the duel!' : youScore === aiScore ? "It's a tie" : `${OPPONENT_LABELS[level]} wins this time`}
        stats={[
          { label: 'Your score', value: youScore },
          { label: `${OPPONENT_LABELS[level]} score`, value: aiScore },
        ]}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const question = rounds[index]
  const concept = conceptById.get(question.conceptId)

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    const attempt = await answer(question, raw, confidence, hintsUsed, ms)
    const opponent = simulateOpponentAnswer(level, question.difficulty)
    const yourPoints = attempt.correctness === 'correct' ? question.difficulty * 10 - hintsUsed * 5 : attempt.correctness === 'partial' ? question.difficulty * 4 : 0
    const aiPoints = opponent.correct ? question.difficulty * 10 : 0
    setYouScore((s) => s + Math.max(0, yourPoints))
    setAiScore((s) => s + aiPoints)
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-surface p-3 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-brand-400">
          <User size={15} /> You: {youScore}
        </span>
        <span className="text-xs text-muted">
          Round {index + 1}/{rounds.length}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-danger-400">
          {OPPONENT_LABELS[level]}: {aiScore}
        </span>
      </div>
      <QuestionCard
        key={question.id}
        question={question}
        concept={concept}
        attempt={lastAttempt}
        grading={grading}
        onAnswer={handleAnswer}
        onNext={() => {
          reset()
          setIndex((i) => i + 1)
        }}
      />
    </div>
  )
}
