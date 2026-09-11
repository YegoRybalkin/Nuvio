import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCourseStore } from '../store/useCourseStore'
import type { SubjectType } from '../types'

const SUBJECT_OPTIONS: { id: SubjectType; label: string; hint: string }[] = [
  { id: 'theory', label: 'Theory-heavy', hint: 'Sociology, leadership, management' },
  { id: 'quantitative', label: 'Quantitative', hint: 'Statistics, finance' },
  { id: 'economics', label: 'Economics', hint: 'Micro/macro, models & graphs' },
  { id: 'accounting', label: 'Accounting / IFRS', hint: 'Standards, journal entries' },
  { id: 'generic', label: 'General / other', hint: 'Business, mixed subjects' },
]

export default function Courses() {
  const courses = useCourseStore((s) => s.courses)
  const concepts = useCourseStore((s) => s.concepts)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const addCourse = useCourseStore((s) => s.addCourse)
  const removeCourse = useCourseStore((s) => s.removeCourse)
  const navigate = useNavigate()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [subjectType, setSubjectType] = useState<SubjectType>('theory')

  const create = () => {
    if (!name.trim()) return
    const course = addCourse(name.trim(), subjectType)
    setCreating(false)
    setName('')
    navigate(`/courses/${course.id}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Courses</h1>
          <p className="mt-1 text-sm text-muted">{courses.length} course{courses.length === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110"
        >
          <Plus size={16} />
          New course
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-surface p-5">
          <label className="mb-1.5 block text-xs font-medium text-muted">Course name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sociology 101"
            className="mb-4 w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
          />
          <label className="mb-1.5 block text-xs font-medium text-muted">Subject type (tunes how AI generates questions)</label>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUBJECT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSubjectType(opt.id)}
                className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  subjectType === opt.id
                    ? 'border-brand-500/60 bg-brand-500/10 text-ink'
                    : 'border-white/10 bg-bg/40 text-muted hover:border-white/20'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs opacity-80">{opt.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={create}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
            >
              Create course
            </button>
          </div>
        </div>
      )}

      {courses.length === 0 && !creating ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-surface p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-muted">No courses yet. Create one to upload material and start studying.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const courseConceptIds = new Set(concepts.filter((c) => c.courseId === course.id).map((c) => c.id))
            const courseMastery = masteryStates.filter((m) => courseConceptIds.has(m.conceptId))
            const avg = courseMastery.length
              ? Math.round(courseMastery.reduce((sum, m) => sum + m.score, 0) / courseMastery.length)
              : null
            return (
              <div key={course.id} className="group relative rounded-2xl border border-white/10 bg-surface p-5 transition hover:border-brand-500/40">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${course.name}"? This removes all its material, questions, and progress.`)) {
                      removeCourse(course.id)
                    }
                  }}
                  className="absolute right-4 top-4 text-muted opacity-0 transition hover:text-danger-400 group-hover:opacity-100"
                  aria-label="Delete course"
                >
                  <Trash2 size={16} />
                </button>
                <Link to={`/courses/${course.id}`} className="flex flex-col">
                  <h2 className="pr-6 font-display text-lg font-semibold text-ink">
                    {course.name}
                    {course.isDemo && <span className="ml-2 text-xs font-normal text-muted">(demo)</span>}
                  </h2>
                  <p className="mt-1 text-xs capitalize text-muted">{course.subjectType} · {courseConceptIds.size} concepts</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted">{course.materialIds.length} materials</span>
                    {avg !== null && <span className="font-semibold text-brand-400">{avg}% mastery</span>}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
