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
