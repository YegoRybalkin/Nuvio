import { sortByImportance } from './importance'
import type { Importance, StudySet } from '../types'

export interface MatchPair {
  id: string
  term: string
  definition: string
  importance?: Importance
}

const MAX_TERM_LEN = 40

/** Builds term/definition pairs for the matching game. AI-generated sets use
 * each concept's short glossary-style definition; heuristic sets fall back to
 * non-cloze flashcards whose front reads like a short term rather than a
 * whole sentence. */
export function buildMatchPairs(studySet: StudySet): MatchPair[] {
  if (studySet.concepts && studySet.concepts.length > 0) {
    return sortByImportance(studySet.concepts).map((c) => ({
      id: c.name,
      term: c.name,
      definition: c.shortDefinition || c.explanation,
      importance: c.importance,
    }))
  }

  const candidates = studySet.flashcards.filter((c) => !c.cloze && c.front.length <= MAX_TERM_LEN)
  return sortByImportance(candidates).map((c) => ({
    id: c.id,
    term: c.front,
    definition: c.back,
    importance: c.importance,
  }))
}
