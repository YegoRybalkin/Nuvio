import { CalendarClock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCourseStore } from '../store/useCourseStore'

export default function Exams() {
  const exams = useCourseStore((s) => s.exams)
  const courses = useCourseStore((s) => s.courses)
  const navigate = useNavigate()

  const sorted = [...exams].sort((a, b) => a.date - b.date)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <CalendarClock size={20} className="text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">Exams</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-8 text-center">
          <p className="mb-3 text-sm text-muted">No exams scheduled yet. Add one from a course's Exams tab.</p>
          <Link to="/courses" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">
            Go to Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((exam) => {
            const course = courses.find((c) => c.id === exam.courseId)
            const daysLeft = Math.ceil((exam.date - Date.now()) / (24 * 60 * 60 * 1000))
            return (
              <div key={exam.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{exam.name}</p>
                  <p className="text-xs text-muted">
                    {course?.name} · {new Date(exam.date).toLocaleDateString()} ·{' '}
                    {daysLeft >= 0 ? `${daysLeft} days left` : 'past'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/exams/${exam.id}/mock`)}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Mock exam
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
