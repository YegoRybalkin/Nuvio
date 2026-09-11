import { Swords } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import QuestionCard from '../QuestionCard'
import { useAnswerQuestion } from '../../lib/useAnswerQuestion'
import { useCourseStore } from '../../store/useCourseStore'
import type { Concept, Confidence, ErrorRecord, Question } from '../../types'
import { GameEndScreen } from './GameHud'

/** Re-tests concepts the student previously got wrong, using a different
 * question on the same concept where one is available rather than repeating
 * the exact item - "wrong before -> correct now" is what clears the error. */
export default function ErrorRevenge({
  errors,
  questions,
  concepts,
  courseId,
  onExit,
}: {
  errors: ErrorRecord[]
  questions: Question[]
  concepts: Concept[]
  courseId: string
  onExit: () => void
}) {
  const markErrorCorrected = useCourseStore((s) => s.markErrorCorrected)
  const recordGameSession = useCourseStore((s) => s.recordGameSession)
  const conceptById = new Map(concepts.map((c) => [c.id, c]))

  const rounds = useMemo(() => {
    const seenConcepts = new Set<string>()
    const items: { errorRecord: ErrorRecord; question: Question }[] = []
    for (const err of errors) {
      if (seenConcepts.has(err.conceptId)) continue
      const alt = questions.find((q) => q.conceptId === err.conceptId && q.id !== err.questionId)
      const fallback = questions.find((q) => q.conceptId === err.conceptId)
      const question = alt ?? fallback
      if (!question) continue
      seenConcepts.add(err.conceptId)
      items.push({ errorRecord: err, question })
    }
    return items
  }, [errors, questions])

  const [index, setIndex] = useState(0)
  const [defeated, setDefeated] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [recorded, setRecorded] = useState(false)
  const { grading, lastAttempt, answer, reset } = useAnswerQuestion('game')

  const finished = index >= rounds.length

  useEffect(() => {
    if (!finished || recorded || rounds.length === 0) return
    setRecorded(true)
    recordGameSession({
      mode: 'error_revenge',
      courseId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      score: correctCount * 15,
      accuracy: rounds.length ? Math.round((correctCount / rounds.length) * 100) : 0,
      highestStreak: correctCount,
      questionsAttempted: rounds.length,
      correct: correctCount,
      difficultyReached: 3,
      result: 'completed',
      weaknessesFound: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, recorded])

  if (rounds.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-sm text-muted">
        No uncorrected errors to revisit right now - nice work, or practice more first to build up an error log.
      </p>
    )
  }

  if (finished) {
    return (
      <GameEndScreen
        icon={<Swords size={32} className="text-brand-400" />}
        title="Error Revenge complete"
        stats={[
          { label: 'Corrected', value: `${correctCount} / ${rounds.length}` },
          { label: 'Misconceptions defeated', value: defeated.length },
        ]}
        onExit={onExit}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const { errorRecord, question } = rounds[index]
  const concept = conceptById.get(question.conceptId)

  const handleAnswer = async (raw: string, confidence: Confidence | undefined, hintsUsed: number, ms: number) => {
    const attempt = await answer(question, raw, confidence, hintsUsed, ms)
    if (attempt.correctness === 'correct') {
      markErrorCorrected(errorRecord.id)
      setDefeated((d) => [...d, concept?.name ?? question.conceptId])
      setCorrectCount((c) => c + 1)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 rounded-xl bg-warn-400/10 p-3 text-xs text-warn-400">
        You previously struggled with <strong>{concept?.name}</strong>. Here's a fresh question on it.
      </p>
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
