import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import QuestionQueueRunner from '../QuestionQueueRunner'
import type { Concept, Question, Topic } from '../../types'

/** Frames a topic's scenario/application/comparison questions as one
 * investigation with linked questions, revealed one at a time - best for
 * applied theory subjects (sociology, economics, leadership, accounting). */
export default function CaseDetective({
  pool,
  concepts,
  topic,
  onExit,
}: {
  pool: Question[]
  concepts: Concept[]
  topic: Topic | undefined
  onExit: () => void
}) {
  const [started, setStarted] = useState(false)
  const caseQuestions = useMemo(
    () =>
      [...pool]
        .filter((q) => ['scenario', 'compare', 'explain_why', 'identify_concept', 'correct_error'].includes(q.type))
        .sort((a, b) => a.difficulty - b.difficulty)
        .slice(0, 6),
    [pool],
  )

  if (caseQuestions.length === 0) {
    return <p className="mx-auto max-w-md text-center text-sm text-muted">Not enough scenario-style questions yet for Case Detective on this topic.</p>
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-surface p-6 text-center">
        <Search size={28} className="mx-auto mb-3 text-brand-400" />
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">Case File: {topic?.name ?? 'Investigation'}</h3>
        <p className="mb-4 text-sm text-muted">
          {caseQuestions.length} linked questions, revealed one at a time as you work through the case. Reason through
          each before moving to the next clue.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Open the case
        </button>
      </div>
    )
  }

  return (
    <QuestionQueueRunner
      questions={caseQuestions}
      concepts={concepts}
      source="game"
      askConfidence
      completionLabel="Case closed"
      onExit={onExit}
    />
  )
}
