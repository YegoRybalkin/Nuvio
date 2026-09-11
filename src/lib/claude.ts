import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { sortByImportance } from './importance'
import { initialSrsState } from './srs'
import type { StudySet } from '../types'

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Best understanding, highest cost' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Great balance of quality and cost' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fastest and cheapest' },
] as const

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5'

// Keep the request affordable/fast for a single analysis pass. Most single
// readings/decks fit comfortably; longer sources are truncated and flagged.
const MAX_INPUT_CHARS = 60_000

const ImportanceSchema = z
  .enum(['core', 'supporting', 'minor'])
  .describe(
    "core = essential to understanding the material, would definitely be tested/needed later; supporting = useful detail that reinforces a core idea; minor = a side note, example, or fact that isn't central",
  )

const StudyKitSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string().max(60).describe('Short concept name, not a full sentence'),
        shortDefinition: z
          .string()
          .max(90)
          .describe('A punchy one-line definition, well under 15 words - used in a matching game, so it must be short'),
        explanation: z
          .string()
          .max(320)
          .describe('Plain-language explanation (2-3 sentences max) of how the concept actually works or fits together'),
        whyItMatters: z
          .string()
          .max(200)
          .describe('One sentence on why this concept matters or what it connects to / enables'),
        importance: ImportanceSchema,
      }),
    )
    .min(3)
    .max(14),
  flashcards: z
    .array(
      z.object({
        question: z
          .string()
          .max(200)
          .describe(
            'A SHORT, single-idea question testing understanding: why/how something happens, how two things relate, what would change under different conditions, or applying the concept to a brief new scenario. One idea per card - never combine multiple sub-questions into one.',
          ),
        answer: z
          .string()
          .max(220)
          .describe(
            'One or two short sentences ONLY. If the full answer needs more than that, it means the question should be split into two separate flashcards instead - never write a paragraph here.',
          ),
        importance: ImportanceSchema,
      }),
    )
    .min(10)
    .max(36),
  quiz: z
    .array(
      z.object({
        prompt: z
          .string()
          .max(240)
          .describe('A scenario or application question testing whether the learner understands why, not just what'),
        choices: z.array(z.string().max(100)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z
          .string()
          .max(220)
          .describe('One or two sentences on why the correct choice is right and the others are wrong'),
        importance: ImportanceSchema,
      }),
    )
    .min(6)
    .max(18),
  summary: z
    .array(z.string().max(280))
    .min(3)
    .max(8)
    .describe('Short paragraphs synthesizing how the main ideas connect, not verbatim extracted sentences'),
})

const SYSTEM_PROMPT = `You are a learning-science-based tutor building a study kit from a student's reading, slides, or notes.

Two priorities, equally important:

1. CONCEPTUAL UNDERSTANDING, not rote memorization of definitions or vocabulary.
   - Concepts: explain how each thing actually works, what causes what, and how it relates to other concepts.
   - Flashcards: mostly "why", "how", "what would happen if", "how does X relate to Y", "compare X and Y", or apply-to-a-new-scenario questions. Only use a plain term/definition card when the material truly is foundational vocabulary, and keep those a small minority.
   - Quiz: multiple-choice questions that put the concept in a slightly new situation, not ones answerable by matching a memorized phrase.
   - Summary: synthesize how the ideas fit together in your own words; do not just copy sentences from the source.

2. RANK EVERYTHING BY IMPORTANCE and keep every card SHORT.
   - Tag every concept, flashcard, and quiz question "core", "supporting", or "minor" based on how central it is to the material - be honest and selective, not everything can be core. A lecture or chapter usually has a handful of genuinely core ideas; the rest is supporting detail or minor color.
   - Produce noticeably more cards for core material than for minor material - a student's time should go where it matters.
   - Every flashcard answer is ONE OR TWO SHORT SENTENCES. If an idea has multiple parts (e.g. "X because of A, B, and C"), split it into separate one-idea flashcards instead of writing a long combined answer. A flashcard a student can't read in a few seconds has failed its job.
   - Each concept also gets a "shortDefinition": a punchy one-line definition (under 15 words) suitable for a matching game - distinct from the longer "explanation".

Base everything strictly on the provided material - do not invent facts that aren't supported by it. If the material is thin on a topic, cover it more lightly rather than fabricating detail.`

export interface ClaudeSettings {
  apiKey: string
  model: string
}

export interface AiGenerationResult {
  studySet: StudySet
  truncated: boolean
}

export async function generateStudySetWithAI(
  rawText: string,
  title: string,
  sourceFileName: string | undefined,
  settings: ClaudeSettings,
): Promise<AiGenerationResult> {
  const truncated = rawText.length > MAX_INPUT_CHARS
  const sourceText = truncated ? rawText.slice(0, MAX_INPUT_CHARS) : rawText

  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.parse({
    model: settings.model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Study material title: ${title}\n\n${sourceText}`,
      },
    ],
    output_config: { format: zodOutputFormat(StudyKitSchema) },
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error('Claude did not return a parseable study kit. Try again, or use quick local analysis.')
  }

  const uid = () => crypto.randomUUID()
  const concepts = sortByImportance(parsed.concepts)
  const flashcards = sortByImportance(parsed.flashcards)
  const quiz = sortByImportance(parsed.quiz)

  const studySet: StudySet = {
    id: uid(),
    title,
    createdAt: Date.now(),
    sourceFileName,
    sourceWordCount: rawText.split(/\s+/).filter(Boolean).length,
    generationMode: 'ai',
    summary: parsed.summary,
    terms: concepts.map((c) => c.name),
    concepts,
    flashcards: flashcards.map((c) => ({
      id: uid(),
      front: c.question,
      back: c.answer,
      cloze: false,
      importance: c.importance,
      srs: initialSrsState(),
    })),
    quiz: quiz.map((q) => ({
      id: uid(),
      type: 'mcq' as const,
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      importance: q.importance,
    })),
    quizAttempts: [],
    matchAttempts: [],
  }

  return { studySet, truncated }
}
