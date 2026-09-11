import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { Confidence, Correctness, QuestionType, SubjectType } from '../types'

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Best understanding, highest cost' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: 'Great balance of quality and cost' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fastest and cheapest' },
] as const

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5'

const MAX_INPUT_CHARS = 60_000

export interface ClaudeSettings {
  apiKey: string
  model: string
}

function client(settings: ClaudeSettings) {
  return new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true })
}

const ImportanceSchema = z
  .enum(['core', 'supporting', 'minor'])
  .describe('core = essential/likely examinable, supporting = reinforcing detail, minor = side note')

const DifficultySchema = z
  .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
  .describe('1=Recall, 2=Understanding, 3=Application, 4=Analysis, 5=Transfer/unfamiliar situation')

const QuestionTypeSchema = z.enum([
  'mcq',
  'free_response',
  'definition',
  'explain_why',
  'compare',
  'scenario',
  'calculation',
  'identify_concept',
  'identify_method',
  'correct_error',
  'teach_back',
  'short_answer',
])

// ---------------------------------------------------------------------------
// Course material analysis: topics, concepts, questions
// ---------------------------------------------------------------------------

const ConceptSchema = z.object({
  name: z.string().max(70),
  definition: z.string().max(300).describe('Plain-language definition/explanation of how it works'),
  learningObjective: z.string().max(160).describe('What the student should be able to do with this concept'),
  formula: z.string().max(160).optional().describe('Formula in plain text if this concept has one, else omit'),
  examples: z.array(z.string().max(200)).max(3).describe('Concrete examples grounded in the material'),
  misconceptions: z.array(z.string().max(200)).max(3).describe('Common misunderstandings students have about this'),
  importance: ImportanceSchema,
})

const QuestionSchema = z.object({
  conceptName: z.string().describe('Must exactly match one of the concept names provided'),
  type: QuestionTypeSchema,
  difficulty: DifficultySchema,
  prompt: z.string().max(400),
  choices: z.array(z.string().max(120)).length(4).optional().describe('Required only when type is mcq'),
  correctIndex: z.number().int().min(0).max(3).optional().describe('Required only when type is mcq'),
  correctAnswer: z
    .string()
    .max(400)
    .describe('Model answer. For calculation questions, state the final numeric answer clearly (e.g. "42.5" or "$1,240").'),
  numericAnswer: z
    .number()
    .optional()
    .describe('Required for calculation-type questions with a single numeric final answer; omit otherwise'),
  rubric: z.array(z.string().max(160)).min(1).max(5).describe('Bullet points a grader checks the answer against'),
  explanation: z.string().max(300).describe('Why the answer is correct, referencing the underlying concept'),
})

const TopicSchema = z.object({
  name: z.string().max(70),
  importance: ImportanceSchema,
  concepts: z.array(ConceptSchema).min(1).max(8),
})

const CourseAnalysisSchema = z.object({
  topics: z.array(TopicSchema).min(1).max(10),
  questions: z.array(QuestionSchema).min(10).max(90),
})

export type CourseAnalysis = z.infer<typeof CourseAnalysisSchema>

function subjectGuidance(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'theory':
      return `This is a THEORY-HEAVY subject (e.g. sociology, leadership, management). For each concept, generate a
progression across questions: recall the idea -> explain it in your own words / explain why -> give a concrete
example -> apply it to a new scenario -> compare/contrast with a related theory or concept. Favor
"explain_why", "compare", "scenario", and "teach_back" question types. Use "mcq" sparingly, mainly for quick
terminology checks, not as the primary format. Most questions should require an open-ended written answer.`
    case 'quantitative':
      return `This is a QUANTITATIVE subject (e.g. statistics, finance, quantitative economics). For each concept
that has a formula or procedure, generate a progression: a conceptual explanation question, a worked-example-style
guided question, an independent problem using the same method, and at least one harder/unfamiliar problem that
mixes this concept with another or applies it to a new context. Use "calculation" as the dominant type for any
concept with a formula, and ALWAYS include numericAnswer with the exact final number for those. Also include
"identify_method" questions that just ask which method/formula applies to a described situation, without solving
it - this trains method selection, not just number-crunching. Never write a question whose answer is "read it off
the slide" - the student must actually compute something.`
    case 'economics':
      return `This is an ECONOMICS subject. For each concept, include: a conceptual explanation question, a
question asking the student to predict or describe how a graph/model shifts (describe in words - do not require
drawing), a calculation where the concept has a formula (use "calculation" with numericAnswer), and a real-world
application/scenario question. Use "scenario" liberally to connect theory to real situations.`
    case 'accounting':
      return `This is an ACCOUNTING / IFRS subject. For each concept that involves a standard or rule, build a
question chain following: classification/rule identification ("identify_method" - e.g. "does this pass the SPPI
test?"), reasoning ("explain_why"), a calculation of the relevant amount ("calculation" with numericAnswer), and
where relevant a question about which financial statement / journal entry side it affects ("scenario" or
"short_answer"). Include at least one "correct_error" question per major topic presenting a wrong classification
or journal entry for the student to correct.`
    default:
      return `This is a general business/university subject. Mix conceptual recall, explain_why, scenario
application, and comparison questions. Use calculation questions only where the material actually contains
formulas or numeric procedures.`
  }
}

const BASE_SYSTEM_PROMPT = `You are an expert university instructor and learning scientist building a structured
knowledge model and question bank from a student's course material, for an adaptive learning platform.

Ground everything in the provided material - do not invent facts, requirements, or numbers that aren't supported by
it. If the material is thin on a topic, cover it lightly rather than fabricating detail.

Organize the material into topics, and each topic into concepts. Every concept needs: a plain-language definition,
a learning objective (what the student should be able to DO with it), a formula if one exists, 1-3 concrete
examples, and 1-3 common misconceptions students have about it. Tag every topic and concept "core" / "supporting" /
"minor" by how central it is - be selective, not everything is core.

Then generate a question bank covering EVERY concept, with difficulty levels 1-5 (1=Recall, 2=Understanding,
3=Application, 4=Analysis, 5=Transfer/unfamiliar situation). Produce more questions, and more high-difficulty
questions, for "core" concepts than for "minor" ones. Every question must reference a conceptName that exactly
matches one of the concepts you defined. Keep every prompt and answer concise and specific - never a vague or
padded question.`

// The full topics/concepts/question-bank schema can legitimately need well
// over 16k output tokens (a real 1,800-word document already hit that
// ceiling and got its JSON cut off mid-string). Streaming avoids the SDK's
// non-streaming timeout risk at this size and lets the model actually finish.
const ANALYSIS_MAX_TOKENS = 32000

export async function analyzeCourseMaterial(
  sourceText: string,
  subjectType: SubjectType,
  settings: ClaudeSettings,
): Promise<{ analysis: CourseAnalysis; truncated: boolean }> {
  const truncated = sourceText.length > MAX_INPUT_CHARS
  const text = truncated ? sourceText.slice(0, MAX_INPUT_CHARS) : sourceText

  const stream = client(settings).messages.stream({
    model: settings.model,
    max_tokens: ANALYSIS_MAX_TOKENS,
    system: `${BASE_SYSTEM_PROMPT}\n\n${subjectGuidance(subjectType)}`,
    messages: [{ role: 'user', content: `Course material:\n\n${text}` }],
    output_config: { format: zodOutputFormat(CourseAnalysisSchema) },
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      "Claude's response was cut off before finishing - this material produced more content than fits in one generation pass. Try a shorter excerpt, or split the material into smaller uploads.",
    )
  }

  const parsed = message.parsed_output
  if (!parsed) {
    throw new Error('Claude did not return a parseable analysis. Try again, or use a shorter excerpt.')
  }
  return { analysis: parsed, truncated }
}

// ---------------------------------------------------------------------------
// Open-response grading
// ---------------------------------------------------------------------------

const GradeSchema = z.object({
  correctness: z.enum(['correct', 'partial', 'incorrect']),
  score: z.number().int().min(0).max(100),
  whatWasCorrect: z.string().max(240),
  whatWasMissing: z.string().max(240),
  whatWasWrong: z.string().max(240),
  improvementTip: z.string().max(240),
  misconceptionTag: z.string().max(80).optional().describe('Short label for the misconception, if any, else omit'),
})

export type AiGradeResult = z.infer<typeof GradeSchema>

const GRADING_SYSTEM_PROMPT = `You are grading a university student's answer against a rubric. Grade like a strict
but fair teaching assistant: do not give credit for restating the question, vague gesturing, or partially-related
content. Reasoning quality matters, not just keyword matches. Use "correct" only when the answer is essentially
right and complete for the difficulty level asked; use "partial" when the core idea is present but incomplete,
imprecise, or missing a required step; use "incorrect" when the answer is wrong or misses the point. Always name
what was correct, what was missing, and what was wrong (empty string if not applicable to that bucket), and give one
concrete tip to improve the reasoning. If you detect a specific misconception, name it briefly in misconceptionTag.`

export async function gradeOpenResponse(
  question: { prompt: string; correctAnswer: string; rubric: string[]; type: QuestionType },
  studentAnswer: string,
  settings: ClaudeSettings,
): Promise<AiGradeResult> {
  const response = await client(settings).messages.parse({
    model: settings.model,
    max_tokens: 2000,
    system: GRADING_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Question (${question.type}): ${question.prompt}\n\nModel answer: ${question.correctAnswer}\n\nRubric:\n${question.rubric.map((r) => `- ${r}`).join('\n')}\n\nStudent's answer: ${studentAnswer || '(no answer given)'}`,
      },
    ],
    output_config: { format: zodOutputFormat(GradeSchema) },
  })

  const parsed = response.parsed_output
  if (!parsed) throw new Error('Grading failed to parse a response.')
  return parsed
}

// ---------------------------------------------------------------------------
// AI tutor
// ---------------------------------------------------------------------------

export interface TutorTurnInput {
  courseName: string
  conceptContext?: string
  sourceExcerpts: string[]
  history: { role: 'user' | 'tutor'; content: string }[]
  userMessage: string
  hintLevel: number
}

function hintInstruction(hintLevel: number): string {
  if (hintLevel <= 0) return 'The student has not asked for help yet on this question - answer normally.'
  if (hintLevel === 1) return 'This is hint request #1: give a small conceptual nudge, not the method or the answer.'
  if (hintLevel === 2) return 'This is hint request #2: be more specific about which concept/formula/step applies, but still do not solve it for them.'
  if (hintLevel === 3) return 'This is hint request #3: walk them through the reasoning step-by-step (guided reasoning), stopping just short of the final answer.'
  return 'The student has asked for help multiple times - give the full explanation now, then ask them to explain it back in their own words.'
}

const TUTOR_SYSTEM_PROMPT = (courseName: string, conceptContext: string | undefined, excerpts: string[]) => `You are
an patient, rigorous AI tutor for a university course called "${courseName}". Ground your explanations in the
course material excerpts below when relevant; if the student asks something outside them, say so and answer from
general knowledge, clearly distinguishing "from your course material" vs "general explanation".

${conceptContext ? `Current concept focus: ${conceptContext}` : ''}

Course material excerpts:
${excerpts.length ? excerpts.map((e, i) => `[${i + 1}] ${e}`).join('\n') : '(no matching excerpts found)'}

Rules:
- Adjust your explanation level to the student's apparent level based on the conversation.
- Use progressive hints rather than immediately giving answers - follow the hint-level instruction given per turn.
- After explaining something substantial, ask the student to explain it back in their own words, and grade their
  explanation for genuine understanding rather than matching your exact wording.
- Keep responses focused - a few short paragraphs at most, not a lecture.`

export async function tutorReply(input: TutorTurnInput, settings: ClaudeSettings): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...input.history.map((h) => ({ role: h.role === 'tutor' ? ('assistant' as const) : ('user' as const), content: h.content })),
    { role: 'user' as const, content: `${input.userMessage}\n\n(${hintInstruction(input.hintLevel)})` },
  ]

  const response = await client(settings).messages.create({
    model: settings.model,
    max_tokens: 1200,
    system: TUTOR_SYSTEM_PROMPT(input.courseName, input.conceptContext, input.sourceExcerpts),
    messages,
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return textBlock?.text ?? "Sorry, I couldn't come up with a response - try rephrasing."
}

export function correctnessFromScore(score: number): Correctness {
  if (score >= 80) return 'correct'
  if (score >= 40) return 'partial'
  return 'incorrect'
}

export function defaultConfidencePrompt(): Confidence[] {
  return ['low', 'medium', 'high']
}
