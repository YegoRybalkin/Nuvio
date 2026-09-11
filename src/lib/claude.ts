import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { StudySet } from '../types'
import { initialSrsState } from './srs'

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Best understanding, highest cost' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Great balance of quality and cost' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fastest and cheapest' },
] as const

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5'

// Keep the request affordable/fast for a single analysis pass. Most single
// readings/decks fit comfortably; longer sources are truncated and flagged.
const MAX_INPUT_CHARS = 60_000

const StudyKitSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string().describe('Short concept name, not a full sentence'),
        explanation: z
          .string()
          .describe('Plain-language explanation of how the concept actually works or fits together'),
        whyItMatters: z
          .string()
          .describe('Why this concept matters or what it connects to / enables'),
      }),
    )
    .min(3)
    .max(12),
  flashcards: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            'A question that tests understanding, not recall of a definition: ask why/how something happens, how two things relate, what would change under different conditions, or to apply the concept to a short new scenario',
          ),
        answer: z.string().describe('A clear explanation-style answer, a few sentences if needed'),
      }),
    )
    .min(8)
    .max(30),
  quiz: z
    .array(
      z.object({
        prompt: z
          .string()
          .describe('A scenario or application question testing whether the learner understands why, not just what'),
        choices: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().describe('Why the correct choice is right and, briefly, why the others are wrong'),
      }),
    )
    .min(6)
    .max(15),
  summary: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe('Short paragraphs synthesizing how the main ideas connect, not verbatim extracted sentences'),
})

const SYSTEM_PROMPT = `You are a learning-science-based tutor building a study kit from a student's reading, slides, or notes.

Your top priority: build genuine CONCEPTUAL UNDERSTANDING, not rote memorization of definitions or vocabulary.
- Concepts: explain how each thing actually works, what causes what, and how it relates to the other concepts in the material.
- Flashcards: mostly "why", "how", "what would happen if", "how does X relate to Y", "compare X and Y", or apply-to-a-new-scenario questions. Only use a plain term/definition card when the material truly is foundational vocabulary the learner must have before anything else makes sense, and keep those to a small minority.
- Quiz: multiple-choice questions that put the concept in a slightly new situation, not ones answerable by matching a memorized phrase.
- Summary: synthesize how the ideas fit together in your own words; do not just copy sentences from the source.

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

  const studySet: StudySet = {
    id: uid(),
    title,
    createdAt: Date.now(),
    sourceFileName,
    sourceWordCount: rawText.split(/\s+/).filter(Boolean).length,
    generationMode: 'ai',
    summary: parsed.summary,
    terms: parsed.concepts.map((c) => c.name),
    concepts: parsed.concepts,
    flashcards: parsed.flashcards.map((c) => ({
      id: uid(),
      front: c.question,
      back: c.answer,
      cloze: false,
      srs: initialSrsState(),
    })),
    quiz: parsed.quiz.map((q) => ({
      id: uid(),
      type: 'mcq' as const,
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    quizAttempts: [],
  }

  return { studySet, truncated }
}
