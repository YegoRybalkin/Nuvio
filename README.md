# Nuvio

Turn any slide deck, reading, or set of notes into an interactive study kit —
flashcards, a quiz, and a spaced-repetition schedule — generated instantly in
the browser, no AI API key required.

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

## How content generation works

There's no LLM call involved — everything runs client-side, instantly:

1. **Extraction** (`src/lib/textExtract.ts`) pulls plain text out of pasted
   text, `.txt`/`.md` files, PDFs (via `pdfjs-dist`), and `.pptx` slide decks
   (by reading the slide XML directly with `jszip`).
2. **Analysis** (`src/lib/nlp.ts`) splits the text into sentences, scores
   word importance by frequency (a classic extractive-summarization signal),
   extracts candidate key terms, and detects explicit "Term: definition" /
   "Term is defined as ..." patterns common in glossaries and lecture slides.
3. **Generation** (`src/lib/generate.ts`) turns that analysis into:
   - Flashcards — real definitions where the source stated them explicitly,
     cloze ("fill in the blank") cards for other key terms.
   - A multiple-choice + true/false quiz with distractors pulled from other
     terms/definitions in the same set.
   - An extractive summary of the most important sentences.
4. **Scheduling** (`src/lib/srs.ts`) implements SM-2 for the flashcard review
   queue.

Everything is stored locally in the browser (`localStorage` via Zustand's
`persist` middleware) — your study sets, XP, and streak all stay on your
device.

## Using it

1. Paste your notes/reading, or upload a `.txt`, `.md`, `.pdf`, or `.pptx`
   file, on the home page.
2. Hit **Generate study kit**. You'll land on the study set page with four
   tabs:
   - **Overview** — due-card count, mastery breakdown, key terms, and a
     focus timer.
   - **Learn** — flip through due flashcards and grade your recall.
   - **Quiz** — a mixed multiple-choice/true-false test with instant
     feedback.
   - **Summary** — the extractive key-points list for a quick review pass.
3. Come back later — the **Library** page tracks every set you've built and
   how many cards are due for review.

## Development

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run lint       # oxlint
```

Built with React, TypeScript, Vite, Tailwind CSS v4, Zustand, and Framer
Motion.
