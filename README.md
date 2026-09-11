# Nuvio

Turn any slide deck, reading, or set of notes into an interactive study kit —
flashcards, a quiz, and a spaced-repetition schedule. Works instantly in the
browser with no API key, or, with your own Anthropic API key, uses Claude to
build real conceptual understanding instead of keyword-based extraction.

## Why it's built this way

Cramming and re-reading are the two least effective ways to study, even
though they *feel* productive. Nuvio is built around the techniques cognitive
science has actually shown to work:

- **Active recall** — every flashcard and quiz question forces you to retrieve
  the answer yourself instead of passively re-reading it. Retrieval practice
  is one of the most reliable, well-replicated findings in learning research.
- **Spaced repetition** — flashcards are scheduled with the SM-2 algorithm
  (the same approach behind Anki/SuperMemo). Rate a card *Again / Hard / Good
  / Easy* and Nuvio decides when you need to see it next, so you review facts
  right before you'd otherwise forget them instead of wasting time on ones
  you already know cold.
- **Interleaving** — quizzes mix question types and topics instead of
  blocking them, which research shows improves your ability to discriminate
  between related concepts.
- **The Feynman technique** — the Summary tab pulls out the most information-
  dense sentences from your source and prompts you to explain each one in
  your own words before a test.
- **Focused work intervals** — a built-in Pomodoro timer (25 min focus / 5 min
  break) sits alongside every study set.
- **Prioritized by importance** — AI-generated material is tagged core /
  supporting / minor, with more cards built for core ideas and due-queues
  studying them first, so time goes to what's actually central instead of
  being spread evenly over everything.

## How content generation works

1. **Extraction** (`src/lib/textExtract.ts`) pulls plain text out of pasted
   text, `.txt`/`.md` files, PDFs (via `pdfjs-dist`, page-by-page so one
   corrupt page doesn't blank out the whole document), and `.docx`/`.pptx`
   files (by reading the document/slide XML directly with `jszip` — no
   server round-trip needed). The raw extracted text is never shown back to
   you — only the generated study kit is.
2. **Generation** — two modes, picked automatically based on whether you've
   added an API key (Settings → gear icon):
   - **Quick local analysis** (`src/lib/nlp.ts` + `src/lib/generate.ts`, the
     default, no key needed): scores word importance by frequency, extracts
     candidate key terms, and detects explicit "Term: definition" patterns,
     then builds definition/cloze flashcards, an MCQ+true/false quiz, and an
     extractive summary of the most important sentences. Runs instantly,
     entirely client-side.
   - **AI concept analysis** (`src/lib/claude.ts`, requires your own
     Anthropic API key): sends the extracted text directly from your browser
     to the Claude API (`@anthropic-ai/sdk`, structured output via
     `messages.parse` + a Zod schema) and asks it to explain *how the
     concepts work and connect*, then build "why/how/what-if" flashcards and
     scenario-based quiz questions that test understanding rather than
     recall. Every concept/card/question is tagged core, supporting, or
     minor, answers are kept to one or two short sentences (a compound idea
     is split into several small cards instead of one long one), and each
     concept gets a short glossary-style definition for the matching game.
     Your key is stored only in this browser's local storage and is never
     sent anywhere except directly to Anthropic.
3. **Scheduling** (`src/lib/srs.ts`) implements SM-2 for the flashcard review
   queue, regardless of which generation mode built the cards.

Everything (study sets, XP, streak, and your API key if you add one) is
stored locally in the browser via Zustand's `persist` middleware — nothing
is sent to any Nuvio server, because there isn't one.

## Using it

1. Paste your notes/reading, or upload a `.txt`, `.md`, `.pdf`, `.docx`, or
   `.pptx` file, on the home page.
2. Hit **Generate study kit**. You'll land on the study set page with four
   tabs:
   - **Overview** — due-card count, mastery breakdown, key concepts (with
     importance tags), quiz history, and a focus timer.
   - **Study** — *Flashcards* (flip and grade) or *Typed recall* (type the
     answer from memory before it's revealed — active production, a
     stronger retrieval signal than recognizing a flipped card).
   - **Play** — *Quiz* (mixed multiple-choice/true-false with instant
     feedback) or the *Matching game* (a timed grid: click a term, then its
     definition, to pair them up — built for locking in vocabulary fast).
   - **Summary** — the synthesized key-points list for a quick review pass.
3. Come back later — the **Library** page tracks every set you've built and
   how many cards are due for review.

## Development

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run lint       # oxlint
```

Built with React, TypeScript, Vite, Tailwind CSS v4, Zustand, Framer Motion,
and (optionally, for AI concept analysis) the Anthropic TypeScript SDK.
