import { AlertTriangle, CalendarClock, Gamepad2, RotateCcw, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildDemoData } from '../lib/demoData'
import { isDue } from '../lib/srs'
import { useCourseStore } from '../store/useCourseStore'
import type { GameMode } from '../types'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const DAILY_MODES: GameMode[] = ['survival', 'mystery', 'boss_battle', 'speed_round']

export default function Dashboard() {
  const courses = useCourseStore((s) => s.courses)
  const concepts = useCourseStore((s) => s.concepts)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const exams = useCourseStore((s) => s.exams)
  const errors = useCourseStore((s) => s.errors)
  const loadDemoData = useCourseStore((s) => s.loadDemoData)
  const navigate = useNavigate()

  const dueCount = masteryStates.filter((m) => isDue(m.srs)).length
  const weakCount = masteryStates.filter((m) => m.band === 'weak').length
  const upcomingExams = [...exams].filter((e) => e.date > Date.now()).sort((a, b) => a.date - b.date).slice(0, 3)

  const recommendedMinutes = useMemo(() => {
    const soonestExamDays = upcomingExams.length ? (upcomingExams[0].date - Date.now()) / 86400000 : Infinity
    if (soonestExamDays <= 3) return 60
    if (dueCount > 15) return 45
    if (dueCount > 5) return 30
    return 15
  }, [dueCount, upcomingExams])

  const courseMastery = courses.map((course) => {
    const ids = new Set(concepts.filter((c) => c.courseId === course.id).map((c) => c.id))
    const scoped = masteryStates.filter((m) => ids.has(m.conceptId))
    const avg = scoped.length ? Math.round(scoped.reduce((a, b) => a + b.score, 0) / scoped.length) : null
    return { course, avg }
  })

  const dailySeed = new Date().toDateString().length + courses.length
  const dailyCourse = courses[dailySeed % Math.max(courses.length, 1)]
  const dailyMode = DAILY_MODES[dailySeed % DAILY_MODES.length]

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <Sparkles size={32} className="mx-auto mb-3 text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">Welcome to Nuvio</h1>
        <p className="mt-2 text-sm text-muted">
          Create a course and upload material to start studying, or load realistic demo data (Sociology + Statistics)
          to try everything immediately.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/courses" className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
            Create a course
          </Link>
          <button
            type="button"
            onClick={() => loadDemoData(buildDemoData())}
            className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            Load demo data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{greeting()}.</h1>

      <div className="mt-4 space-y-2 text-sm text-muted">
        {upcomingExams.map((exam) => {
          const days = Math.ceil((exam.date - Date.now()) / 86400000)
          const course = courses.find((c) => c.id === exam.courseId)
          return (
            <p key={exam.id} className="flex items-center gap-1.5">
              <CalendarClock size={14} className="text-brand-400" />
              {course?.name} — {exam.name} — {days} day{days === 1 ? '' : 's'}
            </p>
          )
        })}
        {dueCount > 0 && (
          <p className="flex items-center gap-1.5">
            <RotateCcw size={14} className="text-accent-400" />
            {dueCount} concepts due for review.
          </p>
        )}
        {weakCount > 0 && (
          <p className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-warn-400" />
            {weakCount} concepts currently weak.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
        <p className="mb-3 text-sm text-muted">Recommended:</p>
        <p className="mb-4 font-display text-lg font-semibold text-ink">{recommendedMinutes}-minute study session</p>
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Start session
        </button>
      </div>

      {dailyCourse && (
        <button
          type="button"
          onClick={() => navigate(`/games/${dailyMode}?courseId=${dailyCourse.id}`)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface p-4 text-left transition hover:border-brand-500/40"
        >
          <Gamepad2 size={20} className="shrink-0 text-brand-400" />
          <span>
            <span className="block text-sm font-semibold text-ink">Daily challenge: {dailyCourse.name}</span>
            <span className="block text-xs text-muted capitalize">{dailyMode.replace('_', ' ')}</span>
          </span>
        </button>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-5">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Course mastery</h3>
        <div className="space-y-3">
          {courseMastery.map(({ course, avg }) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="flex items-center justify-between text-sm hover:text-brand-400">
              <span className="text-ink">{course.name}</span>
              <span className="text-muted">{avg !== null ? `${avg}%` : 'No data yet'}</span>
            </Link>
          ))}
        </div>
      </div>

      {errors.filter((e) => !e.corrected).length > 0 && (
        <p className="mt-4 text-center text-xs text-muted">
          {errors.filter((e) => !e.corrected).length} uncorrected errors across your courses —{' '}
          <Link to="/review" className="text-brand-400 hover:underline">
            review them
          </Link>
          .
        </p>
      )}
    </div>
  )
}
