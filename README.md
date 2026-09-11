# Nuvio

An adaptive learning platform for university subjects (statistics, economics,
sociology, accounting/IFRS, finance, leadership, management, business, and
similar) — built around maximizing **learning, retention, and exam
performance per hour studied**, not around summarizing PDFs or generating
flashcards.

Upload course material → Nuvio extracts a structured knowledge model (topics,
concepts, learning objectives, formulas, misconceptions) and a full question
bank spanning five difficulty levels → you study through active recall,
retrieval practice, and application, get graded (AI or deterministic), and
the system tracks per-concept mastery, spaced review, and errors — then
composes your next study session, mock exam, or game for you.

Works instantly with no API key (quick local analysis); with your own
Anthropic API key it uses Claude for real conceptual understanding, question
generation, grading, and an AI tutor.

## The learning loop

```
Upload material → Understand (concepts) → Retrieve (practice) → Apply
→ Check (grading) → Record errors → Review later (spaced repetition)
→ Mix with other topics (interleaving) → Retest → Mock exam
```

## Try it immediately

```bash
npm install
npm run dev
```

Open the app, then either:
- **Load demo data** (gear icon → Settings → Demo data) — two fully-populated
  courses (Sociology, Statistics) with topics, concepts, a question bank,
  realistic past attempts, an error log, and one upcoming exam each, so you
  can try every feature (dashboard, practice, sessions, all 9 game modes,
  mock exams, progress) without uploading anything.
- Or **create a course** (Courses → New course), pick a subject type, and
  upload a `.txt`/`.md`/`.pdf`/`.docx`/`.pptx` file.

## Architecture

Everything is a local-first, single-user client app (Zustand + localStorage,
no backend/auth) — there's no server, so "your own data" simply means "your
browser's local storage." This was a deliberate scope decision for an
immediately-runnable prototype; see **Known simplifications** below.

### Data model (`src/types.ts`)

`Course → Topic → Concept → Question → QuestionAttempt`, plus `MasteryState`
(per concept), `ErrorRecord`, `Exam` / `MockExamAttempt`, `StudySessionRecord`,
`GameSessionRecord`, and `TutorConversation`. Attempt history is
append-only — mastery is always recomputed from the full history, never
overwritten in place.

### Content generation (`src/lib/courseAi.ts`, `src/lib/heuristicCourseAnalysis.ts`)

- **With an API key**: `analyzeCourseMaterial` sends the extracted text to
  Claude with a subject-aware system prompt (theory-heavy / quantitative /
  economics / accounting each get a different question-generation strategy
  per the spec's flows) and a Zod-validated structured-output schema —
  topics, concepts (definition, learning objective, formula, examples,
  misconceptions, importance), and a question bank tagged with type,
  difficulty (1–5: Recall/Understanding/Application/Analysis/Transfer), a
  grading rubric, and — for calculation questions — an exact numeric answer.
- **Without a key**: `heuristicCourseAnalysis.ts` reuses the existing
  extractive-NLP engine (word-frequency scoring, definition-pattern
  detection) to build concepts and definition/mcq questions. It **cannot**
  generate real calculation problems from arbitrary prose — this is the one
  feature that meaningfully needs the AI path, and is called out in the UI.
- `courseIngestion.ts` resolves generated content back to concrete IDs and
  attaches a best-effort source reference (keyword-overlap chunk matching —
  see Known simplifications) so generated material can be traced to the
  source it came from.

### Grading (`src/lib/attemptGrading.ts`)

One entry point, three strategies, always explicit about which was used:
- **MCQ** — exact match, deterministic.
- **Calculation** — the first number in the answer is extracted and compared
  to the question's exact numeric answer within a tolerance band
  (deterministic code, not an LLM judging arithmetic). Falls back to grading
  the written reasoning if no number is found.
- **Open-ended** — AI grading (rubric-based, explicit correct/missing/wrong
  feedback, detects misconceptions) with a key; a keyword-overlap heuristic
  against the rubric without one (never claims to be AI-graded when it isn't).

### Mastery & spaced repetition (`src/lib/mastery.ts`, `src/lib/conceptSrs.ts`)

`computeMastery` is a deterministic, recency-weighted formula over
correctness × difficulty × hints × confidence-calibration, with two
guardrails: fewer than 3 attempts caps the score below "mastered", and all
attempts crammed into one sitting caps it further — mastery requires
retrieval success spread out over time, not a lucky answer. Concept review
timing reuses a real SM-2 scheduler (`srs.ts`), fed by a grade derived from
each attempt's correctness/hints/confidence.

### Adaptive sessions & exams (`src/lib/sessionGenerator.ts`, `src/lib/examGenerator.ts`)

Given a duration, `generateSessionPlan` composes warm-up retrieval → weak
concepts → active application → spaced review → a closed-book challenge,
picking real questions from the bank and prioritizing due/weak concepts
before generic segments can claim their only remaining question. As an exam
gets closer, weighting shifts toward mixed/harder work. `generateMockExam`
builds a timed, cumulative exam from the bank, weighted toward weaker
concepts and covering every named topic.

### Games (`src/components/games/`)

One shared engine (`useAdaptiveGame.ts` — adaptive difficulty, streaks, a
score formula kept deliberately separate from mastery) powers Survival, Boss
Battle, Speed Round, Mystery Mode, Error Revenge, Knowledge Duel (a
simulated AI opponent — see below), and Calculation Arena; Case Detective and
Exam Quest have their own structure (a scenario chain / a mastery-gated topic
map). All feed real attempts into the same mastery/error pipeline as regular
practice — game score and mastery are tracked separately by design.

### AI Tutor (`src/pages/Tutor.tsx`)

Grounded chat per course/concept with progressive hints (hint depth increases
each time you ask) and simple keyword-based retrieval over uploaded material
as its "RAG" (see below). Falls back to a scripted concept summary without an
API key, since a real conversational tutor genuinely needs an LLM.

## Known simplifications

Built to be honest about what's a real implementation vs. a pragmatic
stand-in for a one-pass build, per the brief's instruction to mark
limitations clearly rather than hide them:

- **No backend, no multi-user auth.** Local-first single-user app by design.
- **"RAG" is keyword/token-overlap retrieval** over chunked source text, not
  an embeddings/vector index. Good enough to ground the tutor and cite
  sources; not semantic search.
- **Knowledge Duel's AI opponent is simulated** (a probability curve by
  chosen level/difficulty), not a live second model call per round — keeps
  duels instant and free to replay.
- **Mock exams draw from the existing question bank** rather than always
  generating fresh questions, so they're instant and don't cost API calls;
  quality is bounded by how good the underlying bank is.
- **No-key heuristic mode can't generate calculation questions** from
  arbitrary text — quantitative subjects need an API key for that part.
- **Case Detective** re-frames a topic's scenario/comparison questions as an
  investigation; it doesn't have a bespoke branching-narrative data model.
- A few display-only date/random calculations run during render rather than
  in an effect (flagged by the linter as a purity nit) — cosmetic only, not
  a state or correctness bug.

## Testing

```bash
npm run test    # vitest - mastery, spaced repetition, grading, session/exam
                # generation, error categorization, game scoring
npm run build   # type-check + production build
npm run lint    # oxlint
```

The test suite already earned its keep once: it caught a duplicate-question
bug and a segment-priority bug in the session generator before this shipped.

Manually verified end-to-end in a real browser: course creation, demo data,
material upload/processing, practice grading (AI-key and heuristic paths),
mastery/error tracking, adaptive session generation, exam creation, a full
timed mock exam, every game mode, the AI tutor (with and without a key), and
state persistence across a full page reload.

## Development

Built with React, TypeScript, Vite, Tailwind CSS v4, Zustand, Framer Motion,
Vitest, and (optionally) the Anthropic TypeScript SDK for AI features.
