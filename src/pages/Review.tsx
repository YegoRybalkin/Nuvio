import { RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import QuestionQueueRunner from '../components/QuestionQueueRunner'
import { isDue } from '../lib/srs'
import { useCourseStore } from '../store/useCourseStore'

/** Due-only spaced review across every course: one question per due concept,
 * distinct from /study's full multi-segment adaptive session. */
export default function Review() {
  const concepts = useCourseStore((s) => s.concepts)
  const questions = useCourseStore((s) => s.questions)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const courses = useCourseStore((s) => s.courses)

  const dueQuestions = useMemo(() => {
    const due = masteryStates.filter((m) => isDue(m.srs))
    const byConcept = new Map<string, typeof questions>()
    for (const q of questions) {
      const list = byConcept.get(q.conceptId)
      if (list) list.push(q)
      else byConcept.set(q.conceptId, [q])
    }

    return due
      .map((m) => {
        const pool = byConcept.get(m.conceptId) ?? []
        if (pool.length === 0) return null
        // Prefer a question at or slightly above the concept's current difficulty comfort zone.
        const targetDifficulty = m.band === 'mastered' ? 4 : m.band === 'good' ? 3 : 2
        const sorted = [...pool].sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty))
        return sorted[0]
      })
      .filter((q) => q !== null)
  }, [masteryStates, questions])

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <RotateCcw size={20} className="text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">Review</h1>
      </div>
      {dueQuestions.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface p-8 text-center text-sm text-muted">
          Nothing due for review right now across your {courses.length} course{courses.length === 1 ? '' : 's'}. The
          spaced-repetition schedule is doing its job - check back later.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">{dueQuestions.length} concepts due for review.</p>
          <QuestionQueueRunner
            questions={dueQuestions}
            concepts={concepts}
            source="session"
            askConfidence
            completionLabel="Review complete"
          />
        </>
      )}
    </div>
  )
}
