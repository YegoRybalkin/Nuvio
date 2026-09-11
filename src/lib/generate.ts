import {
  buildFrequencyMap,
  extractDefinitions,
  extractKeyTerms,
  normalizeSpacing,
  scoreSentence,
  splitSentences,
  type Sentence,
} from './nlp'
import { initialSrsState } from './srs'
import type { Flashcard, QuizQuestion, StudySet } from '../types'

const uid = () => crypto.randomUUID()

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickDistractors<T>(pool: T[], exclude: T, count: number): T[] {
  const candidates = pool.filter((p) => p !== exclude)
  return shuffle(candidates).slice(0, count)
}

/** Replaces the first occurrence of `term` in `sentence` with a blank,
 * case-insensitively, so cloze cards read naturally. */
function makeCloze(sentence: string, term: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i')
  if (!re.test(sentence)) return null
  return sentence.replace(re, '_____')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface GenerateOptions {
  maxFlashcards?: number
  maxQuizQuestions?: number
  maxSummaryPoints?: number
}

export function generateStudySet(
  rawText: string,
  title: string,
  sourceFileName: string | undefined,
  options: GenerateOptions = {},
): StudySet {
  const { maxFlashcards = 30, maxQuizQuestions = 15, maxSummaryPoints = 8 } = options

  const sentences = splitSentences(rawText)
  const freq = buildFrequencyMap(sentences)
  const keyTerms = extractKeyTerms(sentences, freq, 40)
  const definitions = extractDefinitions(sentences)

  const summary = buildSummary(sentences, freq, maxSummaryPoints)
  const flashcards = buildFlashcards(sentences, keyTerms, definitions, maxFlashcards)
  const quiz = buildQuiz(flashcards, keyTerms, maxQuizQuestions)

  return {
    id: uid(),
    title,
    createdAt: Date.now(),
    sourceFileName,
    sourceWordCount: rawText.split(/\s+/).filter(Boolean).length,
    generationMode: 'heuristic',
    summary,
    terms: keyTerms.map((t) => t.term),
    flashcards,
    quiz,
    quizAttempts: [],
    matchAttempts: [],
  }
}

function buildSummary(sentences: Sentence[], freq: Map<string, number>, limit: number): string[] {
  const scored = sentences
    .map((s) => ({ s, score: scoreSentence(s, freq) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .sort((a, b) => a.s.index - b.s.index)

  return scored.map(({ s }) => normalizeSpacing(s.text))
}

function buildFlashcards(
  sentences: Sentence[],
  keyTerms: { term: string; sentenceIndex: number }[],
  definitions: { term: string; definition: string }[],
  limit: number,
): Flashcard[] {
  const cards: Flashcard[] = []
  const coveredTerms = new Set<string>()

  for (const def of definitions) {
    const key = def.term.toLowerCase()
    if (coveredTerms.has(key)) continue
    coveredTerms.add(key)
    cards.push({
      id: uid(),
      front: def.term,
      back: def.definition,
      cloze: false,
      srs: initialSrsState(),
    })
    if (cards.length >= limit) return cards
  }

  for (const kt of keyTerms) {
    const key = kt.term.toLowerCase()
    if (coveredTerms.has(key)) continue
    const sentence = sentences[kt.sentenceIndex]
    if (!sentence) continue
    const cloze = makeCloze(sentence.text, kt.term)
    if (!cloze) continue
    coveredTerms.add(key)
    cards.push({
      id: uid(),
      front: cloze,
      back: kt.term,
      cloze: true,
      srs: initialSrsState(),
    })
    if (cards.length >= limit) break
  }

  return cards
}

function buildQuiz(
  flashcards: Flashcard[],
  keyTerms: { term: string }[],
  limit: number,
): QuizQuestion[] {
  const allTermNames = keyTerms.map((t) => t.term)
  const definitionCards = flashcards.filter((c) => !c.cloze)
  const clozeCards = flashcards.filter((c) => c.cloze)
  const questions: QuizQuestion[] = []

  for (const card of shuffle(definitionCards)) {
    if (questions.length >= limit) break
    const distractors = pickDistractors(
      definitionCards.map((c) => c.back),
      card.back,
      3,
    )
    if (distractors.length < 2) continue
    const choices = shuffle([card.back, ...distractors])
    questions.push({
      id: uid(),
      type: 'mcq',
      prompt: `Which definition matches "${card.front}"?`,
      choices,
      correctIndex: choices.indexOf(card.back),
      explanation: `${card.front}: ${card.back}`,
    })
  }

  for (const card of shuffle(clozeCards)) {
    if (questions.length >= limit) break
    const distractors = pickDistractors(allTermNames, card.back, 3)
    if (distractors.length < 2) continue
    const choices = shuffle([card.back, ...distractors])
    questions.push({
      id: uid(),
      type: 'mcq',
      prompt: card.front,
      choices,
      correctIndex: choices.indexOf(card.back),
      explanation: `The answer is "${card.back}".`,
    })
  }

  // A handful of true/false items add variety and are quick, low-friction
  // retrieval practice between rounds of harder MCQs.
  const tfSource = shuffle(definitionCards).slice(0, Math.min(4, definitionCards.length))
  for (const card of tfSource) {
    if (questions.length >= limit) break
    const isTrue = Math.random() < 0.5
    let shownDefinition = card.back
    if (!isTrue) {
      const other = pickDistractors(
        definitionCards.map((c) => c.back),
        card.back,
        1,
      )[0]
      if (!other) continue
      shownDefinition = other
    }
    questions.push({
      id: uid(),
      type: 'truefalse',
      prompt: `True or false: "${card.front}" means "${shownDefinition}".`,
      choices: ['True', 'False'],
      correctIndex: isTrue ? 0 : 1,
      explanation: `${card.front}: ${card.back}`,
    })
  }

  return shuffle(questions).slice(0, limit)
}
