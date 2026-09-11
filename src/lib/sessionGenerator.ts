import { isDue } from './srs'
import type { Concept, ErrorRecord, Exam, MasteryState, Question, StudySessionSegment } from '../types'

export interface SessionData {
  concepts: Concept[]
  questions: Question[]
  masteryStates: MasteryState[]
  errors: ErrorRecord[]
  exams: Exam[]
}

const SECONDS_PER_QUESTION = 90

interface SegmentSpec {
  label: string
  purpose: StudySessionSegment['purpose']
  share: number
}

const BASE_SEGMENTS: SegmentSpec[] = [
  { label: 'Warm-up retrieval', purpose: 'retrieval', share: 0.15 },
  { label: 'Weak concepts', purpose: 'weak', share: 0.3 },
  { label: 'Active application', purpose: 'application', share: 0.3 },
  { label: 'Spaced review', purpose: 'spaced_review', share: 0.15 },
  { label: 'Closed-book challenge', purpose: 'challenge', share: 0.1 },
]

// Segments are *displayed* in BASE_SEGMENTS order, but *picked* in this
// priority order: spaced review and weak concepts are the segments with a
// specific, narrow job (cover due/weak concepts), so they claim their
// questions before the more flexible application/challenge/retrieval
// segments are allowed to draw from the same shared pool. Otherwise a
// broad segment can starve a due concept of its only remaining question.
const PICK_PRIORITY: StudySessionSegment['purpose'][] = ['spaced_review', 'weak', 'retrieval', 'application', 'challenge']

function daysUntil(dateMs: number): number {
  return (dateMs - Date.now()) / (24 * 60 * 60 * 1000)
}

/** Generates a time-boxed, mixed study plan without the student manually
 * choosing what to study: warm-up retrieval, weak concepts, active
 * application, spaced review, and a closed-book challenge, weighted toward
 * whatever an approaching exam or recent mistakes make most urgent. */
export function generateSessionPlan(minutes: number, data: SessionData, now = Date.now()): StudySessionSegment[] {
  const masteryByConcept = new Map(data.masteryStates.map((m) => [m.conceptId, m]))
  const uncorrectedErrorConceptIds = new Set(data.errors.filter((e) => !e.corrected).map((e) => e.conceptId))

  const nearestExamDays = data.exams.length
    ? Math.min(...data.exams.map((e) => daysUntil(e.date)).filter((d) => d >= -1))
    : Infinity
  const examSoon = Number.isFinite(nearestExamDays) && nearestExamDays <= 14

  // As an exam approaches, shift weight toward mixed/harder work and away
  // from plain warm-up retrieval (more cumulative testing, per the spec).
  const segments = examSoon
    ? BASE_SEGMENTS.map((s) =>
        s.purpose === 'application' || s.purpose === 'challenge' ? { ...s, share: s.share * 1.4 } : s,
      )
    : BASE_SEGMENTS
  const shareTotal = segments.reduce((sum, s) => sum + s.share, 0)

  const dueConceptIds = new Set(
    data.masteryStates.filter((m) => isDue(m.srs, now)).map((m) => m.conceptId),
  )
  const weakConceptIds = new Set(
    data.masteryStates.filter((m) => m.band === 'weak' || m.band === 'developing').map((m) => m.conceptId),
  )

  const usedQuestionIds = new Set<string>()
  const questionsForConcepts = (conceptIds: Set<string> | null, filter?: (q: Question) => boolean) =>
    data.questions.filter(
      (q) => (conceptIds === null || conceptIds.has(q.conceptId)) && !usedQuestionIds.has(q.id) && (!filter || filter(q)),
    )

  function pick(count: number, pools: Question[][]): string[] {
    const chosen: Question[] = []
    const chosenIds = new Set<string>()
    for (const pool of pools) {
      for (const q of pool) {
        if (chosen.length >= count) break
        // Pools passed to one pick() call can overlap (a filtered pool and a
        // broader fallback pool) - guard against picking the same question
        // twice within this call, not just against earlier calls/segments.
        if (usedQuestionIds.has(q.id) || chosenIds.has(q.id)) continue
        chosen.push(q)
        chosenIds.add(q.id)
      }
      if (chosen.length >= count) break
    }
    chosen.forEach((q) => usedQuestionIds.add(q.id))
    return chosen.map((q) => q.id)
  }

  const countFor = (spec: SegmentSpec) => {
    const segMinutes = Math.round((minutes * spec.share) / shareTotal)
    return { segMinutes, count: Math.max(1, Math.round((segMinutes * 60) / SECONDS_PER_QUESTION)) }
  }

  function pickForPurpose(purpose: StudySessionSegment['purpose'], count: number): string[] {
    switch (purpose) {
      case 'retrieval': {
        const attempted = new Set(masteryByConcept.keys())
        return pick(count, [
          questionsForConcepts(attempted, (q) => q.difficulty <= 2),
          questionsForConcepts(null, (q) => q.difficulty <= 2),
        ])
      }
      case 'weak': {
        const weakOrErrored = new Set([...weakConceptIds, ...uncorrectedErrorConceptIds])
        return pick(count, [
          questionsForConcepts(weakOrErrored, (q) => q.difficulty <= 3),
          questionsForConcepts(weakOrErrored),
        ])
      }
      case 'application': {
        const coreConceptIds = new Set(data.concepts.filter((c) => c.importance === 'core').map((c) => c.id))
        return pick(count, [
          questionsForConcepts(coreConceptIds, (q) => q.difficulty >= 3 && q.type !== 'mcq'),
          questionsForConcepts(null, (q) => q.difficulty >= 3 && q.type !== 'mcq'),
          questionsForConcepts(null, (q) => q.difficulty >= 3),
        ])
      }
      case 'spaced_review':
        return pick(count, [questionsForConcepts(dueConceptIds), questionsForConcepts(weakConceptIds)])
      case 'challenge':
        return pick(count, [
          questionsForConcepts(null, (q) => q.difficulty >= 4),
          questionsForConcepts(null, (q) => q.difficulty >= 3),
        ])
    }
  }

  const counts = new Map(segments.map((s) => [s.purpose, countFor(s)]))
  const pickedByPurpose = new Map<StudySessionSegment['purpose'], string[]>()
  for (const purpose of PICK_PRIORITY) {
    const spec = segments.find((s) => s.purpose === purpose)
    const c = counts.get(purpose)
    if (!spec || !c || c.segMinutes < 2) continue
    let ids = pickForPurpose(purpose, c.count)
    if (ids.length === 0) ids = pick(c.count, [questionsForConcepts(null)])
    pickedByPurpose.set(purpose, ids)
  }

  const result: StudySessionSegment[] = []
  for (const spec of segments) {
    const c = counts.get(spec.purpose)
    const ids = pickedByPurpose.get(spec.purpose)
    if (!c || c.segMinutes < 2 || !ids || ids.length === 0) continue
    result.push({ label: spec.label, minutes: c.segMinutes, purpose: spec.purpose, questionIds: ids })
  }

  if (result.length === 0 && data.questions.length > 0) {
    const fallback = pick(Math.max(3, Math.round((minutes * 60) / SECONDS_PER_QUESTION)), [data.questions])
    result.push({ label: 'Study session', minutes, purpose: 'retrieval', questionIds: fallback })
  }

  return result
}

export function conceptForQuestion(question: Question, concepts: Concept[]): Concept | undefined {
  return concepts.find((c) => c.id === question.conceptId)
}
