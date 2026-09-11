import { Brain, FileUp, FileText, Loader2, Sparkles, Upload, X, Zap } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SettingsModal from '../components/SettingsModal'
import StudyTipsPanel from '../components/StudyTipsPanel'
import { generateStudySetWithAI } from '../lib/claude'
import { generateStudySet } from '../lib/generate'
import { extractTextFromFile } from '../lib/textExtract'
import { useStudyStore } from '../store/useStudyStore'

const MIN_WORDS = 40

interface LoadedFile {
  name: string
  text: string
  wordCount: number
}

export default function Home() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<LoadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const addStudySet = useStudyStore((s) => s.addStudySet)
  const apiKey = useStudyStore((s) => s.claudeApiKey)
  const model = useStudyStore((s) => s.claudeModel)

  const sourceText = file ? file.text : text
  const wordCount = file ? file.wordCount : text.trim() ? text.trim().split(/\s+/).length : 0
  const canGenerate = wordCount >= MIN_WORDS && !isGenerating

  const handleFile = useCallback(
    async (uploaded: File) => {
      setError(null)
      setIsParsing(true)
      try {
        const extracted = await extractTextFromFile(uploaded)
        const wc = extracted.text.trim() ? extracted.text.trim().split(/\s+/).length : 0
        if (!extracted.text.trim()) {
          setError("Couldn't find readable text in that file. Try pasting the text instead.")
          return
        }
        setFile({ name: uploaded.name, text: extracted.text, wordCount: wc })
        setText('')
        if (!title) setTitle(uploaded.name.replace(/\.[^.]+$/, ''))
      } catch {
        setError('Something went wrong reading that file. Try a .txt, .md, .pdf, .docx, or .pptx file.')
      } finally {
        setIsParsing(false)
      }
    },
    [title],
  )

  const handleGenerate = async () => {
    if (!canGenerate) return
    setError(null)
    const finalTitle = title.trim() || deriveTitleFromText(sourceText)

    if (apiKey) {
      setIsGenerating(true)
      try {
        const { studySet, truncated } = await generateStudySetWithAI(sourceText, finalTitle, file?.name, {
          apiKey,
          model,
        })
        if (truncated) {
          console.info('Source text was truncated before sending to Claude.')
        }
        addStudySet(studySet)
        navigate(`/set/${studySet.id}`)
      } catch (err) {
        setError(
          err instanceof Error
            ? `AI analysis failed: ${err.message}`
            : 'AI analysis failed. Check your API key in Settings, or leave it blank to use quick local analysis.',
        )
      } finally {
        setIsGenerating(false)
      }
      return
    }

    const studySet = generateStudySet(sourceText, finalTitle, file?.name)
    addStudySet(studySet)
    navigate(`/set/${studySet.id}`)
  }

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pb-6 pt-14 text-center sm:px-6 sm:pt-20">
        <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs font-medium text-muted">
          <Sparkles size={13} className="text-accent-400" />
          Flashcards, quizzes & a study plan built around real understanding
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Turn any reading into a
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {' '}
            study game
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
          Paste your slides, notes, or a chapter — or upload a file. Nuvio analyzes it and builds
          flashcards, quizzes, and a spaced-repetition plan around the concepts, not just the
          vocabulary.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className={`mb-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
            apiKey
              ? 'border-brand-500/30 bg-brand-500/5 hover:border-brand-500/50'
              : 'border-white/10 bg-surface hover:border-white/20'
          }`}
        >
          {apiKey ? (
            <Brain size={18} className="shrink-0 text-brand-400" />
          ) : (
            <Zap size={18} className="shrink-0 text-muted" />
          )}
          <span className="flex-1">
            <span className="font-medium text-ink">
              {apiKey ? 'AI concept analysis is on' : 'Quick local analysis (no API key)'}
            </span>
            <span className="block text-xs text-muted">
              {apiKey
                ? `Using ${model} to explain concepts, not just extract definitions. Tap to change.`
                : 'Add your Anthropic API key for deeper "why/how" understanding instead of keyword extraction.'}
            </span>
          </span>
        </button>

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
            const dropped = e.dataTransfer.files?.[0]
            if (dropped) void handleFile(dropped)
          }}
        >
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg/60 p-4">
              <FileText size={20} className="shrink-0 text-brand-400" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-muted">{file.wordCount.toLocaleString()} words extracted</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className="shrink-0 text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your reading, lecture notes, or slide text here…"
              rows={9}
              className="w-full resize-y rounded-xl border border-white/10 bg-bg/60 p-4 text-sm leading-relaxed text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
            />
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-500/50 hover:text-brand-400"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {file ? 'Replace file' : 'Upload .txt, .md, .pdf, .docx, or .pptx'}
            </button>
            <span className={`text-xs ${canGenerate ? 'text-accent-400' : 'text-muted'}`}>
              {wordCount} words {wordCount >= MIN_WORDS ? '· ready' : `· add ${MIN_WORDS - wordCount} more`}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx,.pptx,.csv"
            className="hidden"
            onChange={(e) => {
              const uploaded = e.target.files?.[0]
              if (uploaded) void handleFile(uploaded)
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
              onClick={() => void handleGenerate()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing with Claude…
                </>
              ) : (
                <>
                  <FileUp size={16} />
                  Generate study kit
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <StudyTipsPanel />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function deriveTitleFromText(text: string): string {
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean)
  if (!firstLine) return 'Untitled study set'
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine
}
