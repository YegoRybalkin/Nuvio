import { Flame, Sparkles } from 'lucide-react'
import { levelFromXp, useCourseStore } from '../store/useCourseStore'

export default function XpBar() {
  const xp = useCourseStore((s) => s.xp)
  const streakDays = useCourseStore((s) => s.streakDays)
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(xp)
  const pct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-warn-400">
        <Flame size={16} className={streakDays > 0 ? 'fill-warn-400' : ''} />
        {streakDays}
      </div>
      <div className="hidden items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 sm:flex">
        <Sparkles size={16} className="text-brand-400" />
        <span className="text-sm font-semibold text-ink">Lv {level}</span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
