import { Bot, Loader2, Send, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tutorReply } from '../lib/courseAi'
import { tokenize } from '../lib/nlp'
import { useCourseStore } from '../store/useCourseStore'
import type { SourceChunk } from '../types'

function retrieveExcerpts(chunks: SourceChunk[], query: string, limit = 3): string[] {
  const queryTokens = new Set(tokenize(query))
  if (queryTokens.size === 0 || chunks.length === 0) return []
  return chunks
    .map((c) => {
      const chunkTokens = tokenize(c.text)
      const overlap = chunkTokens.filter((t) => queryTokens.has(t)).length
      return { c, score: overlap / Math.sqrt(chunkTokens.length + 1) }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c.text)
}

export default function Tutor() {
  const [searchParams] = useSearchParams()
  const initialCourseId = searchParams.get('courseId') ?? undefined
  const initialConceptId = searchParams.get('conceptId') ?? undefined

  const courses = useCourseStore((s) => s.courses)
  const concepts = useCourseStore((s) => s.concepts)
  const materials = useCourseStore((s) => s.materials)
  const claudeApiKey = useCourseStore((s) => s.claudeApiKey)
  const claudeModel = useCourseStore((s) => s.claudeModel)
  const getOrCreateTutorConversation = useCourseStore((s) => s.getOrCreateTutorConversation)
  const addTutorMessage = useCourseStore((s) => s.addTutorMessage)
  const setTutorHintLevel = useCourseStore((s) => s.setTutorHintLevel)
  const tutorConversations = useCourseStore((s) => s.tutorConversations)

  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id)
  const [conceptId, setConceptId] = useState(initialConceptId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const course = courses.find((c) => c.id === courseId)
  const courseConcepts = concepts.filter((c) => c.courseId === courseId)
  const concept = concepts.find((c) => c.id === conceptId)
  const chunks = materials.filter((m) => m.courseId === courseId).flatMap((m) => m.chunks)

  const liveConversation = tutorConversations.find((t) => t.courseId === courseId && t.conceptId === conceptId)

  useEffect(() => {
    if (courseId && !liveConversation) getOrCreateTutorConversation(courseId, conceptId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, conceptId, liveConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveConversation?.messages.length])

  const excerpts = useMemo(() => {
    const query = `${concept?.name ?? ''} ${input}`.trim()
    return retrieveExcerpts(chunks, query || concept?.name || course?.name || '')
  }, [chunks, input, concept, course])

  const send = async (text: string, isHintRequest = false) => {
    if (!course || !liveConversation || !text.trim() || sending) return
    const conversationId = liveConversation.id
    setSending(true)
    addTutorMessage(conversationId, { role: 'user', content: text, timestamp: Date.now() })
    const nextHintLevel = isHintRequest ? liveConversation.hintLevel + 1 : 0
    if (isHintRequest) setTutorHintLevel(conversationId, nextHintLevel)

    try {
      if (!claudeApiKey) {
        const fallback = concept
          ? `Basic mode (no API key set): here's what I have on "${concept.name}":\n\n${concept.definition}\n\n${
              concept.examples.length ? `Example: ${concept.examples[0]}` : ''
            }${concept.misconceptions.length ? `\n\nWatch out for: ${concept.misconceptions[0]}` : ''}\n\nAdd an Anthropic API key in Settings for a real conversational tutor with progressive hints.`
          : 'Add an Anthropic API key in Settings to chat with the AI tutor - pick a concept from a course for a focused explanation in the meantime.'
        addTutorMessage(conversationId, { role: 'tutor', content: fallback, timestamp: Date.now() })
      } else {
        const reply = await tutorReply(
          {
            courseName: course.name,
            conceptContext: concept ? `${concept.name}: ${concept.definition}` : undefined,
            sourceExcerpts: excerpts,
            history: liveConversation.messages.map((m) => ({ role: m.role, content: m.content })),
            userMessage: text,
            hintLevel: nextHintLevel,
          },
          { apiKey: claudeApiKey, model: claudeModel },
        )
        addTutorMessage(conversationId, { role: 'tutor', content: reply, timestamp: Date.now() })
      }
    } catch (e) {
      addTutorMessage(conversationId, {
        role: 'tutor',
        content: `Sorry, something went wrong reaching Claude: ${e instanceof Error ? e.message : 'unknown error'}`,
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-8rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Bot size={20} className="text-brand-400" />
        <h1 className="font-display text-xl font-bold text-ink">AI Tutor</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={courseId ?? ''}
          onChange={(e) => {
            setCourseId(e.target.value)
            setConceptId(undefined)
          }}
          className="rounded-xl border border-white/10 bg-bg/60 px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
        >
          <option value="" disabled>
            Select a course
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={conceptId ?? ''}
          onChange={(e) => setConceptId(e.target.value || undefined)}
          className="rounded-xl border border-white/10 bg-bg/60 px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
        >
          <option value="">General (no specific concept)</option>
          {courseConcepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-surface p-4 scrollbar-thin">
        {!liveConversation || liveConversation.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
            <Sparkles size={24} className="mb-2 text-brand-400" />
            {concept ? `Ask me anything about ${concept.name}.` : 'Pick a course (and optionally a concept), then ask a question.'}
          </div>
        ) : (
          liveConversation.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-bg/60 text-ink'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {concept && (
          <button
            type="button"
            onClick={() => send('Can you give me a hint?', true)}
            disabled={sending || !course}
            className="shrink-0 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-medium text-ink transition hover:bg-white/10 disabled:opacity-50"
          >
            Hint
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              const text = input
              setInput('')
              void send(text)
            }
          }}
          disabled={!course}
          placeholder={course ? 'Ask a question…' : 'Pick a course first'}
          className="flex-1 rounded-xl border border-white/10 bg-bg/60 px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!input.trim() || sending || !course}
          onClick={() => {
            const text = input
            setInput('')
            void send(text)
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
