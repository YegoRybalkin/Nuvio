import { Brain, Layers, RotateCcw, Timer } from 'lucide-react'
import type { ComponentType } from 'react'

interface Tip {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  body: string
}

const TIPS: Tip[] = [
  {
    icon: RotateCcw,
    title: 'Active recall beats re-reading',
    body: 'Testing yourself — flashcards, practice questions — forces retrieval, the single most reliable predictor of long-term memory. Re-reading feels productive but barely helps.',
  },
  {
    icon: Timer,
    title: 'Spaced repetition, not cramming',
    body: 'Reviewing a fact right before you forget it (1 day, then a few days, then weeks) locks it in far more efficiently than one long cramming session. Nuvio schedules this for you automatically.',
  },
  {
    icon: Layers,
    title: 'Interleave topics',
    body: 'Mixing question types and topics in one session (rather than blocking all of one type together) improves your ability to tell concepts apart and transfer knowledge to new problems.',
  },
  {
    icon: Brain,
    title: 'Explain it simply (Feynman technique)',
    body: 'If you can’t explain a concept in plain language, you don’t know it yet. Use the summary view to restate each key point in your own words before a test.',
  },
]

export default function StudyTipsPanel() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="mb-1 font-display text-2xl font-bold text-ink">
        Why this actually works
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Nuvio isn&apos;t just flashcards — every mode is built around the study techniques
        cognitive science has repeatedly shown to work best.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <div
            key={tip.title}
            className="rounded-2xl border border-white/10 bg-surface p-5 transition hover:border-brand-500/40"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
              <tip.icon size={20} />
            </div>
            <h3 className="mb-1 font-display text-base font-semibold text-ink">{tip.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{tip.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
