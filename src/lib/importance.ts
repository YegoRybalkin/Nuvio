import type { Importance } from '../types'

export const IMPORTANCE_RANK: Record<Importance, number> = {
  core: 0,
  supporting: 1,
  minor: 2,
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  core: 'Core',
  supporting: 'Supporting',
  minor: 'Minor',
}

export const IMPORTANCE_CLASS: Record<Importance, string> = {
  core: 'bg-brand-500/15 text-brand-400',
  supporting: 'bg-accent-500/15 text-accent-400',
  minor: 'bg-white/5 text-muted',
}

export function sortByImportance<T extends { importance?: Importance }>(items: T[]): T[] {
  return [...items].sort((a, b) => rank(a.importance) - rank(b.importance))
}

function rank(importance: Importance | undefined): number {
  return importance ? IMPORTANCE_RANK[importance] : 1
}
