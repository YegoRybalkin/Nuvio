import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const WORK_MIN = 25
const BREAK_MIN = 5

type Mode = 'work' | 'break'

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK_MIN * 60)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // Switch modes when a phase completes.
        setMode((m) => {
          const next: Mode = m === 'work' ? 'break' : 'work'
          if (m === 'work') setCycles((c) => c + 1)
          setSecondsLeft((next === 'work' ? WORK_MIN : BREAK_MIN) * 60)
          return next
        })
        return 0
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const reset = () => {
    setRunning(false)
    setMode('work')
    setSecondsLeft(WORK_MIN * 60)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const total = (mode === 'work' ? WORK_MIN : BREAK_MIN) * 60
  const pct = Math.round(((total - secondsLeft) / total) * 100)

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Focus timer</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            mode === 'work' ? 'bg-brand-500/15 text-brand-400' : 'bg-accent-500/15 text-accent-400'
          }`}
        >
          {mode === 'work' ? 'Focus' : 'Break'}
        </span>
      </div>

      <div className="my-4 flex items-center justify-center">
        <div className="relative grid h-32 w-32 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="var(--color-surface-2)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="var(--color-brand-500)"
              strokeWidth="3"
              strokeDasharray={`${pct} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-2xl font-bold tabular-nums text-ink">
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset timer"
          className="rounded-xl bg-white/5 p-2.5 text-ink transition hover:bg-white/10"
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted">{cycles} focus cycle{cycles === 1 ? '' : 's'} completed</p>
    </div>
  )
}
