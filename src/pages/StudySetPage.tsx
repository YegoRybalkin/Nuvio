import { BookOpenCheck, Gamepad2, Layers, NotebookText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import FlashcardStudy from '../components/study/FlashcardStudy'
import MatchGame from '../components/study/MatchGame'
import PomodoroTimer from '../components/study/PomodoroTimer'
import QuizRunner from '../components/study/QuizRunner'
import TypedRecall from '../components/study/TypedRecall'
import { IMPORTANCE_CLASS, IMPORTANCE_LABEL } from '../lib/importance'
import { buildMatchPairs } from '../lib/matchPairs'
import { flashcardStats } from '../lib/srs'
import { useStudyStore } from '../store/useStudyStore'

type Tab = 'overview' | 'study' | 'play' | 'summary'
type StudyMode = 'flashcards' | 'recall'
type PlayMode = 'quiz' | 'match'

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpenCheck },
  { id: 'study', label: 'Study', icon: Layers },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'summary', label: 'Summary', icon: NotebookText },
]

export default function StudySetPage() {
  const { id } = useParams<{ id: string }>()
  const studySet = useStudyStore((s) => s.studySets.find((set) => set.id === id))
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) ?? 'overview'
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcards')
  const [playMode, setPlayMode] = useState<PlayMode>('quiz')

  const stats = useMemo(
    () => (studySet ? flashcardStats(studySet.flashcards) : null),
    [studySet],
  )
  const matchPairs = useMemo(() => (studySet ? buildMatchPairs(studySet) : []), [studySet])

  if (!id || !studySet) return <Navigate to="/library" replace />

  const setTab = (next: Tab) => setSearchParams(next === 'overview' ? {} : { tab: next })
  const goStudy = (mode: StudyMode) => {
    setStudyMode(mode)
    setTab('study')
  }
  const goPlay = (mode: PlayMode) => {
    setPlayMode(mode)
    setTab('play')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{studySet.title}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              studySet.generationMode === 'ai'
                ? 'bg-brand-500/15 text-brand-400'
                : 'bg-white/5 text-muted'
            }`}
          >
            {studySet.generationMode === 'ai' ? 'AI concept analysis' : 'Quick local analysis'}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {studySet.flashcards.length} cards · {studySet.quiz.length} quiz questions ·{' '}
          {studySet.sourceWordCount.toLocaleString()} words analyzed
        </p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-surface p-1 sm:inline-flex sm:w-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
              tab === t.id ? 'bg-brand-500 text-white' : 'text-muted hover:text-ink'
            }`}
          >
            <t.icon size={15} className="shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'study' && (
        <SubModeToggle
          options={[
            { id: 'flashcards', label: 'Flashcards' },
            { id: 'recall', label: 'Typed recall' },
          ]}
          value={studyMode}
          onChange={(m) => setStudyMode(m as StudyMode)}
        />
      )}
      {tab === 'play' && (
        <SubModeToggle
          options={[
            { id: 'quiz', label: 'Quiz' },
            { id: 'match', label: 'Match game' },
          ]}
          value={playMode}
          onChange={(m) => setPlayMode(m as PlayMode)}
        />
      )}

      {tab === 'overview' && stats && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Due now" value={stats.due} accent="text-accent-400" />
              <StatCard label="New" value={stats.mastery.new} accent="text-muted" />
              <StatCard label="Learning" value={stats.mastery.learning + stats.mastery.young} accent="text-warn-400" />
              <StatCard label="Mastered" value={stats.mastery.mature} accent="text-brand-400" />
            </div>

            {studySet.concepts && studySet.concepts.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-surface p-5">
                <h3 className="mb-3 font-display text-sm font-semibold text-ink">Key concepts</h3>
                <div className="space-y-4">
                  {studySet.concepts.map((concept) => (
                    <div key={concept.name} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-semibold text-ink">{concept.name}</p>
                        {concept.importance && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${IMPORTANCE_CLASS[concept.importance]}`}
                          >
                            {IMPORTANCE_LABEL[concept.importance]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{concept.explanation}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-brand-400">
                        Why it matters: {concept.whyItMatters}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-surface p-5">
                <h3 className="mb-3 font-display text-sm font-semibold text-ink">Key terms</h3>
                <div className="flex flex-wrap gap-2">
                  {studySet.terms.slice(0, 20).map((term) => (
                    <span
                      key={term}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {studySet.quizAttempts.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-surface p-5">
                <h3 className="mb-3 font-display text-sm font-semibold text-ink">Quiz history</h3>
                <div className="flex flex-wrap gap-2">
                  {studySet.quizAttempts
                    .slice(-8)
                    .reverse()
                    .map((a, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-muted"
                      >
                        {Math.round((a.score / a.total) * 100)}%
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goStudy('flashcards')}
                className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110"
              >
                {stats.due > 0 ? `Review ${stats.due} cards` : 'Study flashcards'}
              </button>
              <button
                type="button"
                onClick={() => goStudy('recall')}
                className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Typed recall
              </button>
              <button
                type="button"
                onClick={() => goPlay('quiz')}
                className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Take the quiz
              </button>
              <button
                type="button"
                onClick={() => goPlay('match')}
                className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Play matching game
              </button>
            </div>
          </div>

          <PomodoroTimer />
        </div>
      )}

      {tab === 'study' && studyMode === 'flashcards' && (
        <FlashcardStudy
          key={`learn-${studySet.flashcards.length}`}
          setId={studySet.id}
          cards={studySet.flashcards}
          onDone={() => setTab('overview')}
        />
      )}

      {tab === 'study' && studyMode === 'recall' && (
        <TypedRecall
          key={`recall-${studySet.flashcards.length}`}
          setId={studySet.id}
          cards={studySet.flashcards}
          onDone={() => setTab('overview')}
        />
      )}

      {tab === 'play' && playMode === 'quiz' && (
        <QuizRunner setId={studySet.id} questions={studySet.quiz} onDone={() => setTab('overview')} />
      )}

      {tab === 'play' && playMode === 'match' && (
        <MatchGame setId={studySet.id} pairs={matchPairs} onDone={() => setTab('overview')} />
      )}

      {tab === 'summary' && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-surface p-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-ink">Key takeaways</h3>
          <ul className="space-y-3">
            {studySet.summary.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-400">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl bg-bg/40 p-4 text-xs text-muted">
            <strong className="text-ink">Feynman tip:</strong> Cover this list and try to explain
            each point out loud in your own words before moving on — if you get stuck, that's
            exactly what to drill in Study mode.
          </p>
        </div>
      )}
    </div>
  )
}

function SubModeToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="mb-6 flex gap-1 rounded-full bg-surface p-1" style={{ width: 'fit-content' }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            value === opt.id ? 'bg-brand-500/20 text-brand-400' : 'text-muted hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
      <p className={`font-display text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}
