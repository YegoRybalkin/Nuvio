import { BarChart3 } from 'lucide-react'
import { calibrationFlag } from '../lib/mastery'
import { useCourseStore } from '../store/useCourseStore'

export default function Progress() {
  const courses = useCourseStore((s) => s.courses)
  const topics = useCourseStore((s) => s.topics)
  const concepts = useCourseStore((s) => s.concepts)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const attempts = useCourseStore((s) => s.attempts)
  const mockExams = useCourseStore((s) => s.mockExams)

  const totalAttempts = attempts.length
  const correctAttempts = attempts.filter((a) => a.correctness === 'correct').length
  const retrievalAccuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0
  const hintRate = totalAttempts ? Math.round((attempts.filter((a) => a.hintsUsed > 0).length / totalAttempts) * 100) : 0
  const overconfident = attempts.filter((a) => calibrationFlag(a) === 'overconfident').length
  const underconfident = attempts.filter((a) => calibrationFlag(a) === 'underconfident').length
  const masteredCount = masteryStates.filter((m) => m.band === 'mastered').length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <BarChart3 size={22} className="text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">Progress</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Retrieval accuracy" value={`${retrievalAccuracy}%`} />
        <Stat label="Concepts mastered" value={masteredCount} />
        <Stat label="Hint usage rate" value={`${hintRate}%`} />
        <Stat label="Total attempts" value={totalAttempts} />
      </div>

      {(overconfident > 0 || underconfident > 0) && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-surface p-5">
          <h3 className="mb-2 font-display text-sm font-semibold text-ink">Confidence calibration</h3>
          <p className="text-sm text-muted">
            {overconfident} high-confidence wrong answer{overconfident === 1 ? '' : 's'} (priority misconceptions) ·{' '}
            {underconfident} low-confidence correct answer{underconfident === 1 ? '' : 's'} (fragile knowledge worth
            reinforcing).
          </p>
        </div>
      )}

      {mockExams.length > 0 && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-surface p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-ink">Mock exam history</h3>
          <div className="flex flex-wrap gap-2">
            {mockExams
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((m) => (
                <span key={m.id} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted">
                  {m.score}% · {new Date(m.date).toLocaleDateString()}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {courses.map((course) => {
          const courseTopics = topics.filter((t) => t.courseId === course.id)
          return (
            <div key={course.id} className="rounded-2xl border border-white/10 bg-surface p-5">
              <h3 className="mb-3 font-display text-base font-semibold text-ink">{course.name}</h3>
              <div className="space-y-3">
                {courseTopics.map((topic) => (
                  <div key={topic.id}>
                    <p className="mb-1 text-sm font-medium text-ink">{topic.name}</p>
                    <div className="space-y-1">
                      {topic.conceptIds.map((cid) => {
                        const concept = concepts.find((c) => c.id === cid)
                        const mastery = masteryStates.find((m) => m.conceptId === cid)
                        if (!concept) return null
                        return (
                          <div key={cid} className="flex items-center justify-between text-xs">
                            <span className="text-muted">{concept.name}</span>
                            <span
                              className={
                                !mastery
                                  ? 'text-muted'
                                  : mastery.band === 'mastered'
                                    ? 'text-accent-400'
                                    : mastery.band === 'good'
                                      ? 'text-brand-400'
                                      : mastery.band === 'developing'
                                        ? 'text-warn-400'
                                        : 'text-danger-400'
                              }
                            >
                              {mastery ? `${mastery.score}%` : 'New'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {courseTopics.length === 0 && <p className="text-xs text-muted">No material processed yet.</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}
