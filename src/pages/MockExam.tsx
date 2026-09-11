import { AlertCircle, Clock, PartyPopper, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import QuestionQueueRunner from '../components/QuestionQueueRunner'
import { ERROR_CATEGORY_LABEL, categorizeError } from '../lib/errorLog'
import { generateMockExam } from '../lib/examGenerator'
import { useCourseStore } from '../store/useCourseStore'
import type { QuestionAttempt } from '../types'

export default function MockExam() {
  const { id } = useParams<{ id: string }>()
  const exam = useCourseStore((s) => s.exams.find((e) => e.id === id))
  const topics = useCourseStore((s) => s.topics)
  const questions = useCourseStore((s) => s.questions)
  const concepts = useCourseStore((s) => s.concepts)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const recordMockExam = useCourseStore((s) => s.recordMockExam)
  const navigate = useNavigate()

  const [started, setStarted] = useState(false)
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([])
  const [done, setDone] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [recorded, setRecorded] = useState(false)

  const examQuestions = useMemo(
    () => (exam ? generateMockExam(exam, questions, masteryStates) : []),
    [exam, questions, masteryStates],
  )

  useEffect(() => {
    if (!started || done) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setDone(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [started, done])

  useEffect(() => {
    if (!done || recorded || !exam) return
    setRecorded(true)
    const timeSpentMin = Math.round((Date.now() - startedAt) / 60000)
    const correct = attempts.filter((a) => a.correctness === 'correct').length
    const score = attempts.length ? Math.round((correct / attempts.length) * 100) : 0
    const topicBreakdown = exam.topicIds.map((topicId) => {
      const topicAttempts = attempts.filter((a) => a.topicId === topicId)
      const topicCorrect = topicAttempts.filter((a) => a.correctness === 'correct').length
      return {
        topicId,
        topicName: topics.find((t) => t.id === topicId)?.name ?? 'Unknown',
        accuracy: topicAttempts.length ? Math.round((topicCorrect / topicAttempts.length) * 100) : 0,
      }
    })
    recordMockExam({
      examId: exam.id,
      courseId: exam.courseId,
      date: Date.now(),
      questionIds: examQuestions.map((q) => q.id),
      attemptIds: attempts.map((a) => a.id),
      score,
      topicBreakdown,
      timeSpentMin,
      durationMin: exam.durationMin,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  if (!id || !exam) return <Navigate to="/exams" replace />

  if (!started) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <Sparkles size={32} className="mx-auto mb-3 text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">{exam.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {examQuestions.length} questions · {exam.durationMin} minutes · mixed difficulty, weighted toward your
          weaker concepts. Once started, the timer runs continuously.
        </p>
        {examQuestions.length === 0 ? (
          <p className="mt-4 text-sm text-danger-400">No questions available for this exam's topics yet.</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setStarted(true)
              setStartedAt(Date.now())
              setSecondsLeft(exam.durationMin * 60)
            }}
            className="mt-6 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Start mock exam
          </button>
        )}
      </div>
    )
  }

  if (done) {
    const correct = attempts.filter((a) => a.correctness === 'correct').length
    const score = attempts.length ? Math.round((correct / attempts.length) * 100) : 0
    const categoryCounts = new Map<string, number>()
    for (const a of attempts) {
      if (a.correctness === 'correct') continue
      const q = examQuestions.find((eq) => eq.id === a.questionId)
      if (!q) continue
      const cat = categorizeError(q, a)
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
    }
    const timeSpentMin = Math.round((Date.now() - startedAt) / 60000)

    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="mb-6 rounded-3xl border border-brand-500/30 bg-surface p-8 text-center">
          <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
          <h2 className="font-display text-2xl font-bold text-ink">{score}%</h2>
          <p className="mt-1 text-sm text-muted">
            {correct} / {attempts.length} correct · {timeSpentMin} of {exam.durationMin} minutes used
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-surface p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-ink">Topic performance</h3>
          <div className="space-y-2">
            {exam.topicIds.map((topicId) => {
              const topicAttempts = attempts.filter((a) => a.topicId === topicId)
              const topicCorrect = topicAttempts.filter((a) => a.correctness === 'correct').length
              const acc = topicAttempts.length ? Math.round((topicCorrect / topicAttempts.length) * 100) : 0
              return (
                <div key={topicId} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{topics.find((t) => t.id === topicId)?.name}</span>
                  <span className={acc >= 70 ? 'text-accent-400' : acc >= 40 ? 'text-warn-400' : 'text-danger-400'}>{acc}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {categoryCounts.size > 0 && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-surface p-5">
            <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
              <AlertCircle size={15} className="text-warn-400" />
              Error types
            </h3>
            <div className="flex flex-wrap gap-2">
              {[...categoryCounts.entries()].map(([cat, count]) => (
                <span key={cat} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted">
                  {ERROR_CATEGORY_LABEL[cat as keyof typeof ERROR_CATEGORY_LABEL]} × {count}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(`/study?courseId=${exam.courseId}`)}
          className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Start a recommended study session
        </button>
      </div>
    )
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${secondsLeft < 60 ? 'text-danger-400' : 'text-ink'}`}>
          <Clock size={16} />
          {mm}:{ss}
        </span>
        <button type="button" onClick={() => setDone(true)} className="text-xs text-muted hover:text-ink">
          Finish exam now
        </button>
      </div>
      <QuestionQueueRunner
        questions={examQuestions}
        concepts={concepts}
        source="mock_exam"
        completionLabel="Exam finished"
        onAttempt={(a) => setAttempts((prev) => [...prev, a])}
        onComplete={() => setDone(true)}
      />
    </div>
  )
}
