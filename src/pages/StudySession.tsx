import { PartyPopper, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QuestionQueueRunner from '../components/QuestionQueueRunner'
import { celebrateBig } from '../lib/confetti'
import { generateSessionPlan } from '../lib/sessionGenerator'
import { useCourseStore } from '../store/useCourseStore'
import type { StudySessionSegment } from '../types'

const DURATIONS = [15, 30, 45, 60]

export default function StudySession() {
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId') ?? 'all'

  const courses = useCourseStore((s) => s.courses)
  const concepts = useCourseStore((s) => s.concepts)
  const questions = useCourseStore((s) => s.questions)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const errors = useCourseStore((s) => s.errors)
  const exams = useCourseStore((s) => s.exams)
  const recordStudySession = useCourseStore((s) => s.recordStudySession)

  const [minutes, setMinutes] = useState(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [segments, setSegments] = useState<StudySessionSegment[] | null>(null)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [totalCompletedQuestions, setTotalCompletedQuestions] = useState(0)
  const [done, setDone] = useState(false)

  const course = courses.find((c) => c.id === courseId)
  const scopedConceptIds = useMemo(
    () => new Set(courseId === 'all' ? concepts.map((c) => c.id) : concepts.filter((c) => c.courseId === courseId).map((c) => c.id)),
    [concepts, courseId],
  )

  const scopedData = useMemo(
    () => ({
      concepts: concepts.filter((c) => scopedConceptIds.has(c.id)),
      questions: questions.filter((q) => scopedConceptIds.has(q.conceptId)),
      masteryStates: masteryStates.filter((m) => scopedConceptIds.has(m.conceptId)),
      errors: errors.filter((e) => scopedConceptIds.has(e.conceptId)),
      exams: courseId === 'all' ? exams : exams.filter((e) => e.courseId === courseId),
    }),
    [concepts, questions, masteryStates, errors, exams, scopedConceptIds, courseId],
  )

  const effectiveMinutes = customMinutes ? Number(customMinutes) || 0 : minutes

  const start = () => {
    const plan = generateSessionPlan(effectiveMinutes, scopedData)
    setSegments(plan)
    setSegmentIndex(0)
    setTotalCompletedQuestions(0)
    setStartedAt(Date.now())
    setDone(false)
  }

  const conceptsForRunner = scopedData.concepts

  if (!segments) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Start a study session</h1>
        <p className="mb-6 text-sm text-muted">
          {course ? `Scoped to ${course.name}.` : 'Across all your courses.'} We mix warm-up retrieval, your weakest
          concepts, active application, spaced review, and a closed-book challenge - you don't have to plan it.
        </p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMinutes(m)
                setCustomMinutes('')
              }}
              className={`rounded-xl py-3 text-sm font-semibold transition ${
                minutes === m && !customMinutes ? 'bg-brand-500 text-white' : 'bg-surface text-muted hover:text-ink'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <input
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          type="number"
          placeholder="Custom minutes"
          className="mb-6 w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={scopedData.questions.length === 0}
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          <Sparkles size={16} />
          Generate my session
        </button>
        {scopedData.questions.length === 0 && (
          <p className="mt-3 text-center text-xs text-muted">No questions available yet - upload material to a course first.</p>
        )}
      </div>
    )
  }

  if (done) {
    celebrateBig()
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <PartyPopper size={32} className="mx-auto mb-3 text-brand-400" />
        <h2 className="font-display text-xl font-semibold text-ink">Session complete</h2>
        <p className="mt-1 text-sm text-muted">
          {totalCompletedQuestions} questions across {segments.length} segments in ~{effectiveMinutes} minutes.
        </p>
        <button
          type="button"
          onClick={() => setSegments(null)}
          className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
        >
          Start another
        </button>
      </div>
    )
  }

  const segment = segments[segmentIndex]
  const segmentQuestions = segment.questionIds.map((id) => scopedData.questions.find((q) => q.id === id)).filter((q) => q !== undefined)

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          Segment {segmentIndex + 1} of {segments.length}
        </span>
        <span>{segment.minutes} min</span>
      </div>
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">{segment.label}</h2>
      <QuestionQueueRunner
        key={segmentIndex}
        questions={segmentQuestions}
        concepts={conceptsForRunner}
        source="session"
        askConfidence={segment.purpose === 'weak' || segment.purpose === 'challenge'}
        completionLabel={`${segment.label} done`}
        onComplete={(attempts) => {
          setTotalCompletedQuestions((n) => n + attempts.length)
          if (segmentIndex + 1 < segments.length) {
            setSegmentIndex(segmentIndex + 1)
          } else {
            const xpEarned = 15
            recordStudySession({
              courseId: courseId as string,
              startedAt,
              durationMin: effectiveMinutes,
              segments,
              completedQuestionIds: segments.flatMap((s) => s.questionIds),
              xpEarned,
              finishedAt: Date.now(),
            })
            setDone(true)
          }
        }}
      />
    </div>
  )
}
