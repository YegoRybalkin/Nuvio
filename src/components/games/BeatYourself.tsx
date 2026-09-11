import { TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useCourseStore } from '../../store/useCourseStore'
import type { GameMode } from '../../types'

/** Self-comparison rather than a leaderboard: your last attempt at this mode
 * vs. today's, so improvement is measured against yourself. */
export default function BeatYourself({ mode, courseId }: { mode: GameMode; courseId: string }) {
  const allSessions = useCourseStore((s) => s.gameSessions)
  const sessions = useMemo(
    () => allSessions.filter((g) => g.mode === mode && g.courseId === courseId),
    [allSessions, mode, courseId],
  )

  if (sessions.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-5 text-center text-sm text-muted">
        <TrendingUp size={20} className="mx-auto mb-2 text-muted" />
        Play this mode twice to see your improvement here.
      </div>
    )
  }

  const sorted = [...sessions].sort((a, b) => a.endedAt - b.endedAt)
  const previous = sorted[sorted.length - 2]
  const latest = sorted[sorted.length - 1]

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
        <TrendingUp size={15} className="text-accent-400" />
        Beat yourself
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Last attempt</p>
          <p className="text-ink">Accuracy: {previous.accuracy}%</p>
          <p className="text-ink">Difficulty reached: {previous.difficultyReached}</p>
          <p className="text-ink">Score: {previous.score}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-accent-400">Today</p>
          <p className={latest.accuracy >= previous.accuracy ? 'text-accent-400' : 'text-danger-400'}>Accuracy: {latest.accuracy}%</p>
          <p className={latest.difficultyReached >= previous.difficultyReached ? 'text-accent-400' : 'text-danger-400'}>
            Difficulty reached: {latest.difficultyReached}
          </p>
          <p className={latest.score >= previous.score ? 'text-accent-400' : 'text-danger-400'}>Score: {latest.score}</p>
        </div>
      </div>
    </div>
  )
}
