import { Database, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { CLAUDE_MODELS } from '../lib/courseAi'
import { buildDemoData } from '../lib/demoData'
import { useCourseStore } from '../store/useCourseStore'

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const apiKey = useCourseStore((s) => s.claudeApiKey)
  const model = useCourseStore((s) => s.claudeModel)
  const setClaudeApiKey = useCourseStore((s) => s.setClaudeApiKey)
  const setClaudeModel = useCourseStore((s) => s.setClaudeModel)
  const courses = useCourseStore((s) => s.courses)
  const loadDemoData = useCourseStore((s) => s.loadDemoData)
  const resetDemoData = useCourseStore((s) => s.resetDemoData)
  const resetAllData = useCourseStore((s) => s.resetAllData)
  const [draftKey, setDraftKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  const hasDemoData = courses.some((c) => c.isDemo)

  const save = () => {
    setClaudeApiKey(draftKey)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <KeyRound size={18} className="text-brand-400" />
            AI concept analysis
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted">
          Add your own Anthropic API key to have Claude analyze uploaded course material for real conceptual
          understanding, generate a full question bank per concept, grade open-ended answers, and power the AI
          tutor - instead of the quick local keyword-based fallback.
        </p>

        <label className="mb-1.5 block text-xs font-medium text-muted">Anthropic API key</label>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-bg/60 px-3 py-2.5 focus-within:border-brand-500">
          <input
            type={showKey ? 'text' : 'password'}
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="text-muted hover:text-ink"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted">Model</label>
        <div className="mb-4 flex flex-col gap-2">
          {CLAUDE_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setClaudeModel(m.id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                model === m.id
                  ? 'border-brand-500/60 bg-brand-500/10 text-ink'
                  : 'border-white/10 bg-bg/40 text-muted hover:border-white/20'
              }`}
            >
              <span className="font-medium">{m.label}</span>
              <span className="text-xs opacity-80">{m.hint}</span>
            </button>
          ))}
        </div>

        <p className="mb-5 text-xs text-muted">
          Your key stays only in this browser's local storage and is sent directly to Anthropic's
          API - never to any other server. Get a key at{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:underline"
          >
            console.anthropic.com
          </a>
          . Leave it blank to keep using quick local analysis, no key needed.
        </p>

        <div className="mb-5 flex gap-2">
          {apiKey && (
            <button
              type="button"
              onClick={() => {
                setDraftKey('')
                setClaudeApiKey('')
              }}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              Remove key
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Save
          </button>
        </div>

        <div className="border-t border-white/10 pt-5">
          <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
            <Database size={15} className="text-muted" />
            Demo data
          </h3>
          <p className="mb-3 text-xs text-muted">
            Try the whole product instantly with realistic Sociology and Statistics courses (topics, concepts,
            questions, past attempts, errors, and an upcoming exam each).
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadDemoData(buildDemoData())}
              className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white/10"
            >
              Load demo data
            </button>
            {hasDemoData && (
              <button
                type="button"
                onClick={() => resetDemoData()}
                className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white/10"
              >
                Remove demo data
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete ALL courses, progress, and settings? This cannot be undone.')) resetAllData()
            }}
            className="mt-3 w-full rounded-xl bg-danger-400/10 px-3 py-2 text-xs font-semibold text-danger-400 transition hover:bg-danger-400/20"
          >
            Reset all data
          </button>
        </div>
      </div>
    </div>
  )
}
