import { Flame, Heart, Skull, Timer, Trophy } from 'lucide-react'

export function LivesHud({ lives, maxLives, streak, score }: { lives: number; maxLives: number; streak: number; score: number }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-1">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart key={i} size={20} className={i < lives ? 'fill-danger-400 text-danger-400' : 'text-white/10'} />
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {streak > 0 && (
          <span className="flex items-center gap-1 text-warn-400">
            <Flame size={15} />
            {streak}
          </span>
        )}
        <span className="flex items-center gap-1 text-ink">
          <Trophy size={15} className="text-brand-400" />
          {score}
        </span>
      </div>
    </div>
  )
}

export function HealthHud({ health, maxHealth, label, streak, score }: { health: number; maxHealth: number; label: string; streak: number; score: number }) {
  const pct = Math.max(0, Math.round((health / maxHealth) * 100))
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <Skull size={16} className="text-danger-400" />
          {label}
        </span>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span className="flex items-center gap-1 text-warn-400">
              <Flame size={14} />
              {streak}
            </span>
          )}
          <span className="text-muted">{score} pts</span>
        </div>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct > 50 ? 'bg-danger-400' : pct > 20 ? 'bg-warn-400' : 'bg-danger-400/60'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function TimerHud({ secondsLeft, score, correct }: { secondsLeft: number; score: number; correct: number }) {
  return (
    <div className="mb-4 flex items-center justify-between text-sm">
      <span className={`flex items-center gap-1.5 font-semibold ${secondsLeft <= 10 ? 'text-danger-400' : 'text-ink'}`}>
        <Timer size={16} />
        {secondsLeft}s
      </span>
      <span className="text-muted">
        {correct} correct · {score} pts
      </span>
    </div>
  )
}

export function GameEndScreen({
  icon,
  title,
  stats,
  weaknessNames,
  onExit,
  onRetry,
}: {
  icon: React.ReactNode
  title: string
  stats: { label: string; value: string | number }[]
  weaknessNames?: string[]
  onExit: () => void
  onRetry: () => void
}) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-brand-500/30 bg-surface p-8 text-center">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-bg/40 p-3">
            <p className="font-display text-lg font-bold text-ink">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      {weaknessNames && weaknessNames.length > 0 && (
        <div className="mt-4 text-left">
          <p className="mb-1.5 text-xs font-medium text-muted">Weaknesses found:</p>
          <div className="flex flex-wrap gap-1.5">
            {weaknessNames.map((w) => (
              <span key={w} className="rounded-full bg-danger-400/10 px-2.5 py-1 text-xs text-danger-400">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={onExit} className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10">
          Back to Games
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Play again
        </button>
      </div>
    </div>
  )
}
