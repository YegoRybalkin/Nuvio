import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  FileText,
  Layers,
  Loader2,
  Plus,
  Target,
  Upload,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QuestionQueueRunner from '../components/QuestionQueueRunner'
import SettingsModal from '../components/SettingsModal'
import { ERROR_CATEGORY_LABEL } from '../lib/errorLog'
import { IMPORTANCE_CLASS, IMPORTANCE_LABEL } from '../lib/importance'
import { useMaterialIngestion } from '../lib/useMaterialIngestion'
import { useCourseStore } from '../store/useCourseStore'
import type { Exam } from '../types'

type Tab = 'overview' | 'materials' | 'topics' | 'practice' | 'errors' | 'exams'

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpenCheck },
  { id: 'materials', label: 'Materials', icon: FileText },
  { id: 'topics', label: 'Topics', icon: Layers },
  { id: 'practice', label: 'Practice', icon: Target },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
  { id: 'exams', label: 'Exams', icon: CalendarClock },
]

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const course = useCourseStore((s) => s.courses.find((c) => c.id === id))
  // Select stable raw arrays from the store and filter locally - filtering
  // *inside* a zustand selector returns a new array every call, which makes
  // useSyncExternalStore think the snapshot changed on every render and
  // causes an infinite update loop.
  const allMaterials = useCourseStore((s) => s.materials)
  const allTopics = useCourseStore((s) => s.topics)
  const allConcepts = useCourseStore((s) => s.concepts)
  const allQuestions = useCourseStore((s) => s.questions)
  const allMasteryStates = useCourseStore((s) => s.masteryStates)
  const allErrors = useCourseStore((s) => s.errors)
  const allExams = useCourseStore((s) => s.exams)
  const materials = useMemo(() => allMaterials.filter((m) => m.courseId === id), [allMaterials, id])
  const topics = useMemo(() => allTopics.filter((t) => t.courseId === id), [allTopics, id])
  const concepts = useMemo(() => allConcepts.filter((c) => c.courseId === id), [allConcepts, id])
  const questions = useMemo(() => allQuestions.filter((q) => q.courseId === id), [allQuestions, id])
  const masteryStates = useMemo(() => allMasteryStates.filter((m) => m.courseId === id), [allMasteryStates, id])
  const errors = useMemo(() => allErrors.filter((e) => e.courseId === id), [allErrors, id])
  const exams = useMemo(() => allExams.filter((e) => e.courseId === id), [allExams, id])
  const markErrorCorrected = useCourseStore((s) => s.markErrorCorrected)
  const addExam = useCourseStore((s) => s.addExam)
  const removeExam = useCourseStore((s) => s.removeExam)
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) ?? 'overview'
  const setTab = (t: Tab) => setSearchParams(t === 'overview' ? {} : { tab: t })

  const [practiceScope, setPracticeScope] = useState<string | 'all'>('all')
  const [examForm, setExamForm] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const claudeApiKey = useCourseStore((s) => s.claudeApiKey)

  const fallbackCourse = useMemo(
    () => ({ id: '', name: '', subjectType: 'generic' as const, createdAt: 0, materialIds: [], topicIds: [], examIds: [] }),
    [],
  )
  const ingestion = useMaterialIngestion(course ?? fallbackCourse)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const masteryByConcept = useMemo(() => new Map(masteryStates.map((m) => [m.conceptId, m])), [masteryStates])

  const practiceQuestions = useMemo(() => {
    const pool = practiceScope === 'all' ? questions : questions.filter((q) => q.topicId === practiceScope)
    // Interleave: shuffle so consecutive questions rarely share a concept.
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceScope, tab])

  if (!id || !course) return <Navigate to="/courses" replace />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{course.name}</h1>
        <p className="mt-1 text-sm capitalize text-muted">
          {course.subjectType} · {topics.length} topics · {concepts.length} concepts · {questions.length} questions
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-surface p-1 sm:inline-flex sm:w-auto sm:grid-cols-none">
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

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Concepts" value={concepts.length} />
            <StatCard label="Weak" value={masteryStates.filter((m) => m.band === 'weak').length} accent="text-danger-400" />
            <StatCard label="Uncorrected errors" value={errors.filter((e) => !e.corrected).length} accent="text-warn-400" />
            <StatCard label="Upcoming exams" value={exams.filter((e) => e.date > Date.now()).length} accent="text-brand-400" />
          </div>
          {concepts.length === 0 ? (
            <EmptyMaterialsPrompt onGoMaterials={() => setTab('materials')} />
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(`/study?courseId=${course.id}`)}
                className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-110"
              >
                Start adaptive study session
              </button>
              <button
                type="button"
                onClick={() => setTab('practice')}
                className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Free practice
              </button>
              <button
                type="button"
                onClick={() => navigate(`/games?courseId=${course.id}`)}
                className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Play a game
              </button>
            </div>
          )}
          {topics.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-surface p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink">Topic mastery</h3>
              <div className="space-y-3">
                {topics.map((topic) => {
                  const topicMastery = topic.conceptIds.map((cid) => masteryByConcept.get(cid)?.score ?? 0)
                  const avg = topicMastery.length ? Math.round(topicMastery.reduce((a, b) => a + b, 0) / topicMastery.length) : 0
                  return (
                    <div key={topic.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-ink">{topic.name}</span>
                        <span className="text-muted">{avg}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                        <div
                          className={`h-full rounded-full ${avg >= 80 ? 'bg-accent-400' : avg >= 60 ? 'bg-brand-500' : avg >= 30 ? 'bg-warn-400' : 'bg-danger-400'}`}
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'materials' && (
        <div className="space-y-3">
          {!claudeApiKey && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-ink">
              <span>Add your Anthropic API key to analyze material - Nuvio needs it to understand your material and write real questions.</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shrink-0 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-400"
              >
                Add key
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!claudeApiKey || ingestion.stage === 'extracting' || ingestion.stage === 'analyzing'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-surface py-8 text-sm font-medium text-muted transition hover:border-brand-500/50 hover:text-ink disabled:opacity-60"
          >
            {ingestion.stage === 'extracting' || ingestion.stage === 'analyzing' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {ingestion.stage === 'extracting' ? 'Reading file…' : 'Analyzing with AI…'}
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload .txt, .md, .pdf, .docx, or .pptx material
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx,.pptx,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void ingestion.ingestFile(file)
              e.target.value = ''
            }}
          />
          {ingestion.error && <p className="text-sm text-danger-400">{ingestion.error}</p>}
          {ingestion.stage === 'done' && (
            <p className="text-sm text-accent-400">Added {ingestion.conceptCount} concepts to this course.</p>
          )}

          {materials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No material uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface p-4">
                  <FileText size={18} className="shrink-0 text-brand-400" />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-ink">{m.fileName}</p>
                    <p className="text-xs text-muted">{m.wordCount.toLocaleString()} words</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      m.status === 'ready'
                        ? 'bg-accent-500/15 text-accent-400'
                        : m.status === 'failed'
                          ? 'bg-danger-400/15 text-danger-400'
                          : 'bg-warn-400/15 text-warn-400'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'topics' && (
        <div className="space-y-4">
          {topics.length === 0 && <EmptyMaterialsPrompt onGoMaterials={() => setTab('materials')} />}
          {topics.map((topic) => (
            <div key={topic.id} className="rounded-2xl border border-white/10 bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-ink">{topic.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${IMPORTANCE_CLASS[topic.importance]}`}>
                  {IMPORTANCE_LABEL[topic.importance]}
                </span>
              </div>
              <div className="space-y-2">
                {topic.conceptIds.map((cid) => {
                  const concept = concepts.find((c) => c.id === cid)
                  if (!concept) return null
                  const mastery = masteryByConcept.get(cid)
                  return (
                    <div key={cid} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
                      <div>
                        <p className="text-sm text-ink">{concept.name}</p>
                        <p className="text-xs text-muted">{concept.definition}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          !mastery
                            ? 'bg-white/5 text-muted'
                            : mastery.band === 'mastered'
                              ? 'bg-accent-500/15 text-accent-400'
                              : mastery.band === 'good'
                                ? 'bg-brand-500/15 text-brand-400'
                                : mastery.band === 'developing'
                                  ? 'bg-warn-400/15 text-warn-400'
                                  : 'bg-danger-400/15 text-danger-400'
                        }`}
                      >
                        {mastery ? `${mastery.score}%` : 'New'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'practice' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPracticeScope('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${practiceScope === 'all' ? 'bg-brand-500 text-white' : 'bg-surface text-muted hover:text-ink'}`}
            >
              All topics
            </button>
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPracticeScope(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${practiceScope === t.id ? 'bg-brand-500 text-white' : 'bg-surface text-muted hover:text-ink'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <QuestionQueueRunner
            key={`${practiceScope}-${practiceQuestions.length}`}
            questions={practiceQuestions}
            concepts={concepts}
            source="practice"
            askConfidence
            completionLabel="Practice complete"
          />
        </div>
      )}

      {tab === 'errors' && (
        <div className="space-y-2">
          {errors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No errors logged yet - keep practicing.</p>
          ) : (
            errors
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((err) => {
                const question = questions.find((q) => q.id === err.questionId)
                const concept = concepts.find((c) => c.id === err.conceptId)
                return (
                  <div key={err.id} className="rounded-xl border border-white/10 bg-surface p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{concept?.name ?? 'Unknown concept'}</span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                        {ERROR_CATEGORY_LABEL[err.category]}
                      </span>
                      {err.corrected && (
                        <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] text-accent-400">Corrected</span>
                      )}
                    </div>
                    {question && <p className="text-sm text-muted">{question.prompt}</p>}
                    {!err.corrected && (
                      <button
                        type="button"
                        onClick={() => markErrorCorrected(err.id)}
                        className="mt-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-white/10"
                      >
                        Mark corrected
                      </button>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {tab === 'exams' && (
        <ExamsPanel
          courseId={course.id}
          topics={topics}
          exams={exams}
          examForm={examForm}
          setExamForm={setExamForm}
          addExam={addExam}
          removeExam={removeExam}
        />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function EmptyMaterialsPrompt({ onGoMaterials }: { onGoMaterials: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface p-8 text-center">
      <p className="mb-3 text-sm text-muted">Upload course material first to generate topics, concepts, and questions.</p>
      <button
        type="button"
        onClick={onGoMaterials}
        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Go to Materials
      </button>
    </div>
  )
}

function StatCard({ label, value, accent = 'text-ink' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
      <p className={`font-display text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

function ExamsPanel({
  courseId,
  topics,
  exams,
  examForm,
  setExamForm,
  addExam,
  removeExam,
}: {
  courseId: string
  topics: { id: string; name: string }[]
  exams: Exam[]
  examForm: boolean
  setExamForm: (v: boolean) => void
  addExam: (draft: Omit<Exam, 'id'>) => Exam
  removeExam: (id: string) => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [durationMin, setDurationMin] = useState(60)
  const [format, setFormat] = useState('Mixed')
  const [topicIds, setTopicIds] = useState<string[]>([])

  const submit = () => {
    if (!name.trim() || !date) return
    addExam({
      courseId,
      name: name.trim(),
      date: new Date(date).getTime(),
      topicIds: topicIds.length ? topicIds : topics.map((t) => t.id),
      format,
      durationMin,
    })
    setExamForm(false)
    setName('')
    setDate('')
    setTopicIds([])
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExamForm(!examForm)}
        className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <Plus size={16} />
        Add exam
      </button>

      {examForm && (
        <div className="rounded-2xl border border-white/10 bg-surface p-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exam name"
            className="mb-3 w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
          />
          <div className="mb-3 grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none"
            />
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              placeholder="Duration (min)"
              className="rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
          <input
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="Format (e.g. Mixed, MCQ only, essay)"
            className="mb-3 w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopicIds((ids) => (ids.includes(t.id) ? ids.filter((i) => i !== t.id) : [...ids, t.id]))}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  topicIds.includes(t.id) ? 'bg-brand-500 text-white' : 'bg-bg/40 text-muted hover:text-ink'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || !date}
            className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            Save exam
          </button>
        </div>
      )}

      {exams.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No exams scheduled.</p>
      ) : (
        exams
          .slice()
          .sort((a, b) => a.date - b.date)
          .map((exam) => {
            const daysLeft = Math.ceil((exam.date - Date.now()) / (24 * 60 * 60 * 1000))
            return (
              <div key={exam.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{exam.name}</p>
                  <p className="text-xs text-muted">
                    {new Date(exam.date).toLocaleDateString()} · {daysLeft >= 0 ? `${daysLeft} days left` : 'past'} · {exam.durationMin} min · {exam.format}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/exams/${exam.id}/mock`)}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Mock exam
                </button>
                <button
                  type="button"
                  onClick={() => removeExam(exam.id)}
                  aria-label="Delete exam"
                  className="text-muted hover:text-danger-400"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })
      )}
    </div>
  )
}
