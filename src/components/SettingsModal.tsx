import { Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { CLAUDE_MODELS } from '../lib/claude'
import { useStudyStore } from '../store/useStudyStore'

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const apiKey = useStudyStore((s) => s.claudeApiKey)
  const model = useStudyStore((s) => s.claudeModel)
  const setClaudeApiKey = useStudyStore((s) => s.setClaudeApiKey)
  const setClaudeModel = useStudyStore((s) => s.setClaudeModel)
  const [draftKey, setDraftKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

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
        className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"
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
          Add your own Anthropic API key to have Claude analyze your material for real conceptual
          understanding — explanations of how ideas connect, "why/how" flashcards, and
          scenario-based quiz questions — instead of the quick local keyword-based analysis.
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
          API when you generate a study kit — never to any other server. Get a key at{' '}
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

        <div className="flex gap-2">
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
      </div>
    </div>
  )
}
