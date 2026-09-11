import { describe, expect, it } from 'vitest'
import { damageForDifficulty, nextDifficulty, scoreForAnswer, simulateOpponentAnswer } from './gameLogic'

describe('scoreForAnswer', () => {
  it('awards zero points for an incorrect answer', () => {
    expect(scoreForAnswer(3, 'incorrect', 0, 0)).toBe(0)
  })

  it('awards more points for higher difficulty at the same correctness/streak', () => {
    const easy = scoreForAnswer(1, 'correct', 0, 0)
    const hard = scoreForAnswer(5, 'correct', 0, 0)
    expect(hard).toBeGreaterThan(easy)
  })

  it('penalizes hint usage', () => {
    const noHints = scoreForAnswer(3, 'correct', 0, 0)
    const withHints = scoreForAnswer(3, 'correct', 2, 0)
    expect(withHints).toBeLessThan(noHints)
  })

  it('rewards a longer streak', () => {
    const noStreak = scoreForAnswer(3, 'correct', 0, 0)
    const bigStreak = scoreForAnswer(3, 'correct', 0, 8)
    expect(bigStreak).toBeGreaterThan(noStreak)
  })

  it('gives partial answers less than full credit', () => {
    const partial = scoreForAnswer(3, 'partial', 0, 0)
    const full = scoreForAnswer(3, 'correct', 0, 0)
    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(full)
  })
})

describe('damageForDifficulty', () => {
  it('increases monotonically with difficulty', () => {
    const values = [1, 2, 3, 4, 5].map((d) => damageForDifficulty(d as 1 | 2 | 3 | 4 | 5))
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1])
  })
})

describe('nextDifficulty', () => {
  it('ramps up after two consecutive correct answers', () => {
    expect(nextDifficulty(2, 2, true)).toBe(3)
  })
  it('does not ramp up after only one correct answer', () => {
    expect(nextDifficulty(2, 1, true)).toBe(2)
  })
  it('eases down after two consecutive wrong answers', () => {
    expect(nextDifficulty(3, 2, false)).toBe(2)
  })
  it('never goes above 5 or below 1', () => {
    expect(nextDifficulty(5, 2, true)).toBe(5)
    expect(nextDifficulty(1, 2, false)).toBe(1)
  })
})

describe('simulateOpponentAnswer', () => {
  it('gives a professor opponent higher accuracy than a rookie over many trials', () => {
    let rookieCorrect = 0
    let professorCorrect = 0
    const trials = 500
    for (let i = 0; i < trials; i++) {
      if (simulateOpponentAnswer('rookie', 2).correct) rookieCorrect++
      if (simulateOpponentAnswer('professor', 2).correct) professorCorrect++
    }
    expect(professorCorrect).toBeGreaterThan(rookieCorrect)
  })

  it('always returns a positive response time', () => {
    for (let i = 0; i < 20; i++) {
      expect(simulateOpponentAnswer('student', 3).responseMs).toBeGreaterThan(0)
    }
  })
})
