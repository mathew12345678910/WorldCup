import { describe, it, expect } from 'vitest'
import {
  groupPts,
  outrightPts,
  specialPts,
  koBase,
  koPts,
  applyJoker,
  scoreGroupPick,
  scoreAllGroupPicks,
  scoreKnockoutPick,
  scoreAllKnockoutPicks,
  scoreSpecialPick,
  scoreNoveltyPick,
  scoreAllNoveltyPicks,
  calculateTotalScore,
  GROUP_CAP,
  SPECIAL_CAP,
  JOKER_MULT,
  KO_MULT,
  NOVELTY_PTS,
  type GroupPickResult,
  type KnockoutPickResult,
  type SpecialPickResult,
  type NoveltyPickResult,
} from './scoring'

// ── Formula tests ────────────────────────────────────────────────

describe('groupPts', () => {
  it('returns 3 when odds = 1', () => {
    expect(groupPts(1)).toBe(3)
  })

  it('calculates correctly for odds = 5', () => {
    // 3 + 3.5 * sqrt(5-1) = 3 + 3.5 * 2 = 10
    expect(groupPts(5)).toBe(10)
  })

  it('caps at GROUP_CAP = 41', () => {
    const at41 = groupPts(41)
    const at100 = groupPts(100)
    expect(at100).toBe(at41)
  })

  it('calculates correctly for odds = 10', () => {
    // 3 + 3.5 * sqrt(9) = 3 + 10.5 = 13.5
    expect(groupPts(10)).toBe(13.5)
  })
})

describe('outrightPts', () => {
  it('returns 8 when odds = 1', () => {
    expect(outrightPts(1)).toBe(8)
  })

  it('calculates correctly for odds = 17', () => {
    // 8 + 2.5 * sqrt(16) = 8 + 10 = 18
    expect(outrightPts(17)).toBe(18)
  })

  it('caps at SPECIAL_CAP = 51', () => {
    expect(outrightPts(100)).toBe(outrightPts(51))
  })
})

describe('specialPts', () => {
  it('returns 6 when odds = 1', () => {
    expect(specialPts(1)).toBe(6)
  })

  it('calculates correctly for odds = 26', () => {
    // 6 + 1.5 * sqrt(25) = 6 + 7.5 = 13.5
    expect(specialPts(26)).toBe(13.5)
  })

  it('caps at SPECIAL_CAP', () => {
    expect(specialPts(200)).toBe(specialPts(51))
  })
})

describe('koBase', () => {
  it('returns 7 when odds = 1', () => {
    expect(koBase(1)).toBe(7)
  })

  it('calculates correctly for odds = 10', () => {
    // 7 + 2 * sqrt(9) = 7 + 6 = 13
    expect(koBase(10)).toBe(13)
  })

  it('caps at SPECIAL_CAP', () => {
    expect(koBase(100)).toBe(koBase(51))
  })
})

describe('koPts', () => {
  it('applies R32 multiplier (1.0)', () => {
    expect(koPts(10, 'R32')).toBe(koBase(10) * 1.0)
  })

  it('applies R16 multiplier (1.25)', () => {
    expect(koPts(10, 'R16')).toBe(koBase(10) * 1.25)
  })

  it('applies QF multiplier (1.75)', () => {
    expect(koPts(10, 'QF')).toBe(koBase(10) * 1.75)
  })

  it('applies SF multiplier (2.5)', () => {
    expect(koPts(10, 'SF')).toBe(koBase(10) * 2.5)
  })

  it('applies FINAL multiplier (3.5)', () => {
    expect(koPts(10, 'FINAL')).toBe(koBase(10) * 3.5)
  })

  it('defaults to 1.0 for unknown round', () => {
    expect(koPts(10, 'UNKNOWN')).toBe(koBase(10) * 1.0)
  })
})

describe('applyJoker', () => {
  it('returns pts unchanged when not joker', () => {
    expect(applyJoker(10, false)).toBe(10)
  })

  it('applies 1.5x multiplier when joker', () => {
    expect(applyJoker(10, true)).toBe(15)
  })
})

// ── Group pick scoring ───────────────────────────────────────────

describe('scoreGroupPick', () => {
  const basePick: GroupPickResult = {
    groupLetter: 'A',
    teamId: 1,
    predictedPosition: 1,
    actualPosition: null,
    odds: 5,
    isJoker: false,
  }

  it('returns 0 when result not yet known', () => {
    expect(scoreGroupPick(basePick)).toBe(0)
  })

  it('scores 100% for correct 1st place', () => {
    const pick = { ...basePick, actualPosition: 1 }
    // groupPts(5) = 10, * 1.0 = 10
    expect(scoreGroupPick(pick)).toBe(10)
  })

  it('scores 10% for predicted 1st actual 2nd', () => {
    const pick = { ...basePick, actualPosition: 2 }
    // groupPts(5) = 10, * 0.1 = 1
    expect(scoreGroupPick(pick)).toBe(1)
  })

  it('scores 100% for correct 2nd place', () => {
    const pick = { ...basePick, predictedPosition: 2, actualPosition: 2 }
    expect(scoreGroupPick(pick)).toBe(10)
  })

  it('scores 10% for predicted 2nd actual 1st', () => {
    const pick = { ...basePick, predictedPosition: 2, actualPosition: 1 }
    expect(scoreGroupPick(pick)).toBe(1)
  })

  it('scores 0 for eliminated team (position > 2)', () => {
    const pick = { ...basePick, actualPosition: 3 }
    expect(scoreGroupPick(pick)).toBe(0)
  })

  it('applies joker multiplier', () => {
    const pick = { ...basePick, actualPosition: 1, isJoker: true }
    // groupPts(5) = 10 * 1.5 = 15
    expect(scoreGroupPick(pick)).toBe(15)
  })
})

describe('scoreAllGroupPicks', () => {
  it('counts ALL picks — no picks are dropped', () => {
    const picks: GroupPickResult[] = Array.from({ length: 10 }, (_, i) => ({
      groupLetter: String.fromCharCode(65 + i),
      teamId: i + 1,
      predictedPosition: 1,
      actualPosition: 1,
      odds: i + 2, // increasing odds = increasing points
      isJoker: false,
    }))

    const result = scoreAllGroupPicks(picks)
    // All 10 picks are kept, none dropped
    expect(result.kept.length).toBe(10)
    expect(result.dropped.length).toBe(0)
    // Total should equal sum of all individual scores
    const expectedTotal = picks.reduce((sum, p) => {
      // groupPts(odds) * 1.0 for all (all predicted 1st, actual 1st)
      const pts = 3 + 3.5 * Math.sqrt(p.odds - 1)
      return sum + pts
    }, 0)
    expect(result.total).toBeCloseTo(expectedTotal, 1)
  })

  it('handles fewer than 8 picks — all still count', () => {
    const picks: GroupPickResult[] = Array.from({ length: 5 }, (_, i) => ({
      groupLetter: String.fromCharCode(65 + i),
      teamId: i + 1,
      predictedPosition: 1,
      actualPosition: 1,
      odds: 5,
      isJoker: false,
    }))

    const result = scoreAllGroupPicks(picks)
    expect(result.kept.length).toBe(5)
    expect(result.dropped.length).toBe(0)
  })

  it('handles empty picks', () => {
    const result = scoreAllGroupPicks([])
    expect(result.total).toBe(0)
    expect(result.kept.length).toBe(0)
  })
})

// ── Knockout pick scoring ────────────────────────────────────────

describe('scoreKnockoutPick', () => {
  it('returns 0 for incorrect pick', () => {
    const pick: KnockoutPickResult = {
      matchId: 1,
      teamId: 1,
      round: 'R16',
      odds: 3,
      isJoker: false,
      correct: false,
    }
    expect(scoreKnockoutPick(pick)).toBe(0)
  })

  it('scores correctly for R16 correct pick', () => {
    const pick: KnockoutPickResult = {
      matchId: 1,
      teamId: 1,
      round: 'R16',
      odds: 5,
      isJoker: false,
      correct: true,
    }
    // koBase(5) = 7 + 2*sqrt(4) = 11, * 1.25 = 13.75
    expect(scoreKnockoutPick(pick)).toBe(13.75)
  })

  it('applies joker to knockout pick', () => {
    const pick: KnockoutPickResult = {
      matchId: 1,
      teamId: 1,
      round: 'QF',
      odds: 5,
      isJoker: true,
      correct: true,
    }
    // koBase(5) = 11, * 1.75 = 19.25, * 1.5 = 28.875
    expect(scoreKnockoutPick(pick)).toBe(28.875)
  })
})

describe('scoreAllKnockoutPicks', () => {
  it('sums all correct knockout picks', () => {
    const picks: KnockoutPickResult[] = [
      { matchId: 1, teamId: 1, round: 'R16', odds: 5, isJoker: false, correct: true },
      { matchId: 2, teamId: 2, round: 'QF', odds: 5, isJoker: false, correct: true },
      { matchId: 3, teamId: 3, round: 'SF', odds: 5, isJoker: false, correct: false },
    ]
    const result = scoreAllKnockoutPicks(picks)
    // R16: 11 * 1.25 = 13.75, QF: 11 * 1.75 = 19.25, SF: 0
    expect(result.total).toBe(33)
    expect(result.breakdown.length).toBe(3)
  })
})

// ── Special pick scoring ─────────────────────────────────────────

describe('scoreSpecialPick', () => {
  it('returns 0 for incorrect', () => {
    const pick: SpecialPickResult = {
      pickType: 'tournament_winner',
      odds: 5,
      isJoker: false,
      correct: false,
      isOutright: true,
    }
    expect(scoreSpecialPick(pick)).toBe(0)
  })

  it('uses outrightPts for outright picks', () => {
    const pick: SpecialPickResult = {
      pickType: 'tournament_winner',
      odds: 5,
      isJoker: false,
      correct: true,
      isOutright: true,
    }
    // outrightPts(5) = 8 + 2.5*sqrt(4) = 13
    expect(scoreSpecialPick(pick)).toBe(13)
  })

  it('uses specialPts for non-outright picks', () => {
    const pick: SpecialPickResult = {
      pickType: 'golden_boot',
      odds: 5,
      isJoker: false,
      correct: true,
      isOutright: false,
    }
    // specialPts(5) = 6 + 1.5*sqrt(4) = 9
    expect(scoreSpecialPick(pick)).toBe(9)
  })

  it('applies joker to special pick', () => {
    const pick: SpecialPickResult = {
      pickType: 'tournament_winner',
      odds: 5,
      isJoker: true,
      correct: true,
      isOutright: true,
    }
    // 13 * 1.5 = 19.5
    expect(scoreSpecialPick(pick)).toBe(19.5)
  })
})

// ── Novelty pick scoring ─────────────────────────────────────────

describe('scoreNoveltyPick', () => {
  it('returns 0 for incorrect', () => {
    expect(scoreNoveltyPick({ pickType: 'first_goal', correct: false })).toBe(0)
  })

  it('returns correct points per type', () => {
    expect(scoreNoveltyPick({ pickType: 'host_performance', correct: true })).toBe(8)
    expect(scoreNoveltyPick({ pickType: 'final_penalty', correct: true })).toBe(6)
    expect(scoreNoveltyPick({ pickType: 'most_cards', correct: true })).toBe(8)
    expect(scoreNoveltyPick({ pickType: 'biggest_upset', correct: true })).toBe(6)
    expect(scoreNoveltyPick({ pickType: 'first_goal', correct: true })).toBe(10)
    expect(scoreNoveltyPick({ pickType: 'hat_trick', correct: true })).toBe(5)
    expect(scoreNoveltyPick({ pickType: 'own_goal', correct: true })).toBe(10)
  })

  it('returns 0 for unknown type', () => {
    expect(scoreNoveltyPick({ pickType: 'unknown_type', correct: true })).toBe(0)
  })
})

describe('scoreAllNoveltyPicks', () => {
  it('sums correct novelty picks', () => {
    const picks: NoveltyPickResult[] = [
      { pickType: 'first_goal', correct: true },
      { pickType: 'hat_trick', correct: false },
      { pickType: 'own_goal', correct: true },
    ]
    const result = scoreAllNoveltyPicks(picks)
    expect(result.total).toBe(20) // 10 + 0 + 10
  })
})

// ── Total scoring ────────────────────────────────────────────────

describe('calculateTotalScore', () => {
  it('combines all scoring categories', () => {
    const groupPicks: GroupPickResult[] = [
      { groupLetter: 'A', teamId: 1, predictedPosition: 1, actualPosition: 1, odds: 5, isJoker: false },
    ]
    const knockoutPicks: KnockoutPickResult[] = [
      { matchId: 1, teamId: 1, round: 'R16', odds: 5, isJoker: false, correct: true },
    ]
    const specialPicks: SpecialPickResult[] = [
      { pickType: 'tournament_winner', odds: 5, isJoker: false, correct: true, isOutright: true },
    ]
    const noveltyPicks: NoveltyPickResult[] = [
      { pickType: 'first_goal', correct: true },
    ]

    const result = calculateTotalScore(groupPicks, knockoutPicks, specialPicks, noveltyPicks)
    // group: 10, ko: 13.75, special: 13, novelty: 10
    expect(result.groupPoints).toBe(10)
    expect(result.knockoutPoints).toBe(13.75)
    expect(result.specialPoints).toBe(13)
    expect(result.noveltyPoints).toBe(10)
    expect(result.totalPoints).toBe(46.75)
  })

  it('returns all zeros for empty picks', () => {
    const result = calculateTotalScore([], [], [], [])
    expect(result.totalPoints).toBe(0)
    expect(result.groupPoints).toBe(0)
    expect(result.knockoutPoints).toBe(0)
    expect(result.specialPoints).toBe(0)
    expect(result.noveltyPoints).toBe(0)
  })
})

// ── Constants sanity ─────────────────────────────────────────────

describe('constants', () => {
  it('has correct cap values', () => {
    expect(GROUP_CAP).toBe(41)
    expect(SPECIAL_CAP).toBe(51)
  })

  it('has correct joker multiplier', () => {
    expect(JOKER_MULT).toBe(1.5)
  })

  it('has correct KO multipliers', () => {
    expect(KO_MULT.R32).toBe(1.0)
    expect(KO_MULT.R16).toBe(1.25)
    expect(KO_MULT.QF).toBe(1.75)
    expect(KO_MULT.SF).toBe(2.5)
    expect(KO_MULT.F).toBe(3.5)
    expect(KO_MULT.FINAL).toBe(3.5)
  })

  it('has all novelty point values', () => {
    expect(Object.keys(NOVELTY_PTS).length).toBe(7)
  })
})
