import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dueCount } from '../lib/srs'
import { useStudyStore } from '../store/useStudyStore'

export default function Library() {
  const studySets = useStudyStore((s) => s.studySets)
  const removeStudySet = useStudyStore((s) => s.removeStudySet)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Your library</h1>
          <p className="mt-1 text-sm text-muted">
            {studySets.length} study {studySets.length === 1 ? 'set' : 'sets'}
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110"
        >
          <Plus size={16} />
          New set
        </Link>
      </div>

      {studySets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-surface p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-muted">No study sets yet. Paste something on the home page to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studySets.map((set) => {
            const due = dueCount(set.flashcards.map((c) => c.srs))
            const bestScore = set.quizAttempts.length
              ? Math.max(...set.quizAttempts.map((a) => Math.round((a.score / a.total) * 100)))
              : null
            return (
              <div
                key={set.id}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-surface p-5 transition hover:border-brand-500/40"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    if (confirm(`Delete "${set.title}"? This can't be undone.`)) {
                      removeStudySet(set.id)
                    }
                  }}
                  className="absolute right-4 top-4 text-muted opacity-0 transition hover:text-danger-400 group-hover:opacity-100"
                  aria-label="Delete study set"
                >
                  <Trash2 size={16} />
                </button>
                <Link to={`/set/${set.id}`} className="flex flex-1 flex-col">
                  <h2 className="pr-6 font-display text-lg font-semibold text-ink">{set.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {set.flashcards.length} cards · {set.quiz.length} quiz Qs
                  </p>
                  <div className="mt-4 flex flex-1 items-end justify-between gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        due > 0 ? 'bg-accent-500/15 text-accent-400' : 'bg-white/5 text-muted'
                      }`}
                    >
                      {due > 0 ? `${due} due for review` : 'All caught up'}
                    </span>
                    {bestScore !== null && (
                      <span className="font-semibold text-brand-400">Best {bestScore}%</span>
                    )}
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
