import {
  Calculator,
  Gamepad2,
  HelpCircle,
  Search,
  Skull,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { isDue } from '../lib/srs'
import { useCourseStore } from '../store/useCourseStore'
import type { GameMode } from '../types'

const MODE_CARDS: { id: GameMode; label: string; description: string; icon: typeof Skull }[] = [
  { id: 'survival', label: 'Survival', description: '3 lives, escalating difficulty', icon: Skull },
  { id: 'boss_battle', label: 'Boss Battle', description: 'Take down a weak topic', icon: Swords },
  { id: 'speed_round', label: 'Speed Round', description: 'Fast terminology drills', icon: Zap },
  { id: 'mystery', label: 'Mystery Mode', description: 'Guess the method first', icon: HelpCircle },
  { id: 'case_detective', label: 'Case Detective', description: 'Investigate a scenario', icon: Search },
  { id: 'calculation_arena', label: 'Calculation Arena', description: '5 escalating rounds', icon: Calculator },
  { id: 'error_revenge', label: 'Error Revenge', description: 'Beat your past mistakes', icon: Target },
  { id: 'knowledge_duel', label: 'Knowledge Duel', description: 'You vs an AI opponent', icon: Trophy },
  { id: 'exam_quest', label: 'Exam Quest', description: 'Topic map to a mock exam', icon: Trophy },
]

function recommendMode(subjectType: string | undefined, weakCount: number, dueCount: number, examSoon: boolean): GameMode {
  if (examSoon) return 'exam_quest'
  if (dueCount >= 5) return 'survival'
  if (subjectType === 'quantitative' || subjectType === 'accounting') return weakCount > 0 ? 'calculation_arena' : 'boss_battle'
  if (subjectType === 'theory' || subjectType === 'economics') return 'case_detective'
  return 'survival'
}

export default function Games() {
  const [searchParams, setSearchParams] = useSearchParams()
  const courses = useCourseStore((s) => s.courses)
  const concepts = useCourseStore((s) => s.concepts)
  const masteryStates = useCourseStore((s) => s.masteryStates)
  const exams = useCourseStore((s) => s.exams)
  const navigate = useNavigate()

  const courseId = searchParams.get('courseId') ?? courses[0]?.id
  const course = courses.find((c) => c.id === courseId)

  const stats = useMemo(() => {
    if (!courseId) return { weak: 0, due: 0, examSoon: false }
    const conceptIds = new Set(concepts.filter((c) => c.courseId === courseId).map((c) => c.id))
    const scoped = masteryStates.filter((m) => conceptIds.has(m.conceptId))
    const weak = scoped.filter((m) => m.band === 'weak' || m.band === 'developing').length
    const due = scoped.filter((m) => isDue(m.srs)).length
    const examSoon = exams.some((e) => e.courseId === courseId && (e.date - Date.now()) / 86400000 <= 10 && e.date > Date.now())
    return { weak, due, examSoon }
  }, [courseId, concepts, masteryStates, exams])

  const recommended = course ? recommendMode(course.subjectType, stats.weak, stats.due, stats.examSoon) : null

  if (courses.length === 0) {
    return <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted">Create a course and add material first.</p>
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Gamepad2 size={22} className="text-brand-400" />
        <h1 className="font-display text-2xl font-bold text-ink">Games</h1>
      </div>

      <select
        value={courseId ?? ''}
        onChange={(e) => setSearchParams({ courseId: e.target.value })}
        className="mb-4 rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {recommended && (
        <button
          type="button"
          onClick={() => navigate(`/games/${recommended}?courseId=${courseId}`)}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-left transition hover:border-brand-500/50"
        >
          <TrendingUp size={20} className="shrink-0 text-brand-400" />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Recommended: {MODE_CARDS.find((m) => m.id === recommended)?.label}
            </span>
            <span className="block text-xs text-muted">
              Based on {stats.due} due reviews, {stats.weak} weak concepts, and upcoming exams.
            </span>
          </span>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {MODE_CARDS.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => navigate(`/games/${mode.id}?courseId=${courseId}`)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-4 text-left transition hover:border-brand-500/40"
          >
            <mode.icon size={20} className="shrink-0 text-brand-400" />
            <span>
              <span className="block text-sm font-semibold text-ink">{mode.label}</span>
              <span className="block text-xs text-muted">{mode.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
