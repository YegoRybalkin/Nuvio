// Lightweight, dependency-free text analysis. No external AI calls: everything
// here runs instantly in the browser using classic extractive-NLP heuristics
// (word-frequency scoring, pattern-based definition detection, cloze deletion).

export const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be
  because been before being below between both but by can't cannot could
  couldn't did didn't do does doesn't doing don't down during each few for
  from further had hadn't has hasn't have haven't having he he'd he'll he's
  her here here's hers herself him himself his how how's i i'd i'll i'm i've
  if in into is isn't it it's its itself let's me more most mustn't my
  myself no nor not of off on once only or other ought our ours ourselves
  out over own same shan't she she'd she'll she's should shouldn't so some
  such than that that's the their theirs them themselves then there there's
  these they they'd they'll they're they've this those through to too under
  until up very was wasn't we we'd we'll we're we've were weren't what
  what's when when's where where's which while who who's whom why why's
  with won't would wouldn't you you'd you'll you're you've your yours
  yourself yourselves also may might must shall using used use one two
  three etc e.g. i.e. eg ie will can within across per fig figure slide
  chapter section page`
    .split(/\s+/)
    .filter(Boolean),
)

export interface Sentence {
  index: number
  text: string
  words: string[]
}

/** Splits on sentence-ending punctuation while tolerating common abbreviations
 * and bullet/newline breaks typical of slide decks. */
export function splitSentences(raw: string): Sentence[] {
  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/[•●▪◦‣]/g, '\n')
    .replace(/-\n/g, '')
    .replace(/[ \t]+/g, ' ')

  const protectedText = cleaned.replace(
    /\b(e\.g|i\.e|etc|Dr|Mr|Mrs|Ms|Prof|vs|Fig|No)\./gi,
    (m) => m.replace('.', '<DOT>'),
  )

  const lines = protectedText.split('\n')
  const rawSentences: string[] = []
  for (const line of lines) {
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    for (const part of parts) {
      const trimmed = part.replace(/<DOT>/g, '.').trim()
      if (trimmed) rawSentences.push(trimmed)
    }
  }

  const sentences: Sentence[] = []
  let idx = 0
  for (const text of rawSentences) {
    const words = tokenize(text)
    if (words.length < 4 || words.length > 60) continue
    if (!/[a-zA-Z]/.test(text)) continue
    sentences.push({ index: idx++, text: normalizeSpacing(text), words })
  }
  return sentences
}

export function normalizeSpacing(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? []).filter(
    (w) => w.length > 1,
  )
}

/** Word-frequency importance score, the classic Luhn/TF summarization signal. */
export function buildFrequencyMap(sentences: Sentence[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const s of sentences) {
    for (const w of s.words) {
      if (STOPWORDS.has(w) || /^\d+$/.test(w)) continue
      freq.set(w, (freq.get(w) ?? 0) + 1)
    }
  }
  return freq
}

export function scoreSentence(s: Sentence, freq: Map<string, number>): number {
  if (s.words.length === 0) return 0
  const sum = s.words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0)
  return sum / Math.sqrt(s.words.length)
}

export interface KeyTerm {
  term: string
  score: number
  sentenceIndex: number
}

const TERM_RE = /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,2}|[a-z][a-z0-9-]{3,})\b/g

/** Extracts candidate key terms: multi-word capitalized phrases (proper
 * nouns / named concepts) plus frequent lowercase content words, ranked by
 * how central they are to the text. */
export function extractKeyTerms(
  sentences: Sentence[],
  freq: Map<string, number>,
  limit = 24,
): KeyTerm[] {
  const candidates = new Map<
    string,
    { display: string; score: number; sentenceIndex: number; count: number }
  >()

  for (const s of sentences) {
    const seen = new Set<string>()
    for (const match of s.text.matchAll(TERM_RE)) {
      const raw = match[0].trim()
      const key = raw.toLowerCase()
      if (STOPWORDS.has(key) || key.length < 4) continue
      if (seen.has(key)) continue
      seen.add(key)

      const words = key.split(/\s+/)
      const isProperPhrase = /^[A-Z]/.test(raw) && words.length > 1
      const wordScore = words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0)
      const bonus = isProperPhrase ? 2 : 1
      const score = wordScore * bonus

      const existing = candidates.get(key)
      if (!existing) {
        candidates.set(key, { display: raw, score, sentenceIndex: s.index, count: 1 })
      } else {
        existing.count += 1
        if (score > existing.score) {
          existing.score = score
          existing.sentenceIndex = s.index
        }
        // Prefer a capitalized display form once we see one (proper nouns / titles).
        if (/^[A-Z]/.test(raw) && !/^[A-Z]/.test(existing.display)) {
          existing.display = raw
        }
      }
    }
  }

  const ranked = [...candidates.values()]
    .filter((v) => v.score > 0)
    .map((v) => ({
      term: v.display,
      score: v.score * (1 + Math.log2(v.count)),
      sentenceIndex: v.sentenceIndex,
    }))
    .sort((a, b) => b.score - a.score)

  const deduped: KeyTerm[] = []
  const seenLower = new Set<string>()
  for (const item of ranked) {
    const lower = item.term.toLowerCase()
    if ([...seenLower].some((s) => s.includes(lower) || lower.includes(s))) continue
    seenLower.add(lower)
    deduped.push(item)
    if (deduped.length >= limit) break
  }
  return deduped
}

/** Splits raw text into ~targetSize-character chunks on sentence boundaries,
 * for simple in-browser "RAG": each chunk becomes a retrievable/citable unit
 * without needing an embeddings index. */
export function chunkText(raw: string, targetSize = 1000): string[] {
  const sentences = splitSentences(raw)
  if (sentences.length === 0) return raw.trim() ? [raw.trim()] : []

  const chunks: string[] = []
  let current = ''
  for (const s of sentences) {
    if (current.length + s.text.length > targetSize && current) {
      chunks.push(current.trim())
      current = ''
    }
    current += `${s.text} `
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export interface DefinitionMatch {
  term: string
  definition: string
}

const DEFINITION_PATTERNS: RegExp[] = [
  /^([A-Z][\w -]{2,40}?)\s*[:–—-]\s+(.{15,220})$/,
  /^([A-Z][\w -]{2,40}?)\s+(?:is|are|was|were)\s+(?:defined as|known as|called)\s+(.{10,220})$/i,
  /^([A-Z][\w -]{2,40}?)\s+(?:refers to|means|represents)\s+(.{10,220})$/i,
  /^(?:The term\s+)?([A-Z][\w -]{2,40}?)\s+(?:is|are)\s+(a|an|the)\s+(.{10,220})$/,
]

// Words a genuine definition should never trail off on. A match ending on one
// of these is a sign the source line wrapped or got cut mid-thought (common
// when a PDF/slide bullet spans two lines) rather than a real, complete
// definition - better to drop it than surface a broken fragment as an answer.
const DANGLING_END_WORDS = new Set(
  `a an the in on at by for with and or but of to from as that which who
  whom into onto than then so if because while when where`
    .split(/\s+/)
    .filter(Boolean),
)

export function looksTruncated(text: string): boolean {
  const words = text.trim().split(/\s+/)
  const last = words[words.length - 1]?.toLowerCase().replace(/[.,!?;:]+$/, '')
  return !last || DANGLING_END_WORDS.has(last)
}

/** Finds explicit "Term: definition" / "Term is a ..." patterns, which make
 * much higher quality flashcards than generic cloze deletion when present
 * (common in glossary slides and textbook call-out boxes). */
export function extractDefinitions(sentences: Sentence[]): DefinitionMatch[] {
  const found: DefinitionMatch[] = []
  for (const s of sentences) {
    for (const pattern of DEFINITION_PATTERNS) {
      const m = s.text.match(pattern)
      if (m) {
        const term = m[1].trim()
        const rest = m.length > 3 ? `${m[2]} ${m[3]}`.trim() : m[2].trim()
        if (term.split(/\s+/).length <= 6 && rest.length > 8 && !looksTruncated(rest)) {
          found.push({ term, definition: normalizeSpacing(rest) })
        }
        break
      }
    }
  }
  return found
}
