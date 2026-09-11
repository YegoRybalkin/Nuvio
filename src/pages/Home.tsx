import { FileUp, Loader2, Sparkles, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudyTipsPanel from '../components/StudyTipsPanel'
import { generateStudySet } from '../lib/generate'
import { extractTextFromFile } from '../lib/textExtract'
import { useStudyStore } from '../store/useStudyStore'

const MIN_WORDS = 40

export default function Home() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [fileName, setFileName] = useState<string>()
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const addStudySet = useStudyStore((s) => s.addStudySet)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const canGenerate = wordCount >= MIN_WORDS

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setIsParsing(true)
    try {
      const extracted = await extractTextFromFile(file)
      if (!extracted.text.trim()) {
        setError("Couldn't find readable text in that file. Try pasting the text instead.")
        return
      }
      setText(extracted.text)
      setFileName(file.name)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch {
      setError('Something went wrong reading that file. Try a .txt, .md, .pdf, or .pptx file.')
    } finally {
      setIsParsing(false)
    }
  }, [title])

  const handleGenerate = () => {
    if (!canGenerate) return
    const finalTitle = title.trim() || deriveTitleFromText(text)
    const studySet = generateStudySet(text, finalTitle, fileName)
    addStudySet(studySet)
    navigate(`/set/${studySet.id}`)
  }

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pb-6 pt-14 text-center sm:px-6 sm:pt-20">
        <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs font-medium text-muted">
          <Sparkles size={13} className="text-accent-400" />
          Flashcards, quizzes & a study plan — generated instantly, no AI key needed
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Turn any reading into a
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {' '}
            study game
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
          Paste your slides, notes, or a chapter. Nuvio extracts the key ideas and builds
          flashcards, quizzes, and a spaced-repetition plan around them.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <div
          className={`rounded-3xl border-2 border-dashed p-4 transition sm:p-6 ${
            isDragging ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 bg-surface'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void handleFile(file)
          }}
        >
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setFileName(undefined)
            }}
            placeholder="Paste your reading, lecture notes, or slide text here…"
            rows={9}
            className="w-full resize-y rounded-xl border border-white/10 bg-bg/60 p-4 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-500/50 hover:text-brand-400"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {fileName ?? 'Upload .txt, .md, .pdf, or .pptx'}
            </button>
            <span className={`text-xs ${canGenerate ? 'text-accent-400' : 'text-muted'}`}>
              {wordCount} words {canGenerate ? '· ready' : `· add ${MIN_WORDS - wordCount} more`}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.pptx,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />

          {error && <p className="mt-3 text-sm text-danger-400">{error}</p>}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Study set title (optional)"
              className="flex-1 rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileUp size={16} />
              Generate study kit
            </button>
          </div>
        </div>
      </section>

      <StudyTipsPanel />
    </div>
  )
}

function deriveTitleFromText(text: string): string {
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean)
  if (!firstLine) return 'Untitled study set'
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine
}
