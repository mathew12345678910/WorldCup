/**
 * WC26 Predictor — Scoring Engine v5
 * Pure functions. No DB calls.
 */

import type { MatchStage } from '@/types/database'

// ── Constants ────────────────────────────────────────────────────
export const GROUP_CAP = 41
export const SPECIAL_CAP = 51
export const JOKER_MULT = 1.5

export const KO_MULT: Record<string, number> = {
  R32: 1.0,
  R16: 1.25,
  QF: 1.75,
  SF: 2.5,
  F: 3.5,
  FINAL: 3.5,
  THIRD: 1.0,
}

export const NOVELTY_PTS: Record<string, number> = {
  host_performance: 8,
  final_penalty: 6,
  most_cards: 8,
  biggest_upset: 6,
  first_goal: 10,
  hat_trick: 5,
  own_goal: 10,
}

// ── Formulas ─────────────────────────────────────────────────────

/** Group stage points: 3 + 3.5 × √(min(odds, 41) − 1) */
export function groupPts(odds: number): number {
  const capped = Math.min(odds, GROUP_CAP)
  return 3 + 3.5 * Math.sqrt(capped - 1)
}

/** Outright/tournament winner points: 8 + 2.5 × √(min(odds, 51) − 1) */
export function outrightPts(odds: number): number {
  const capped = Math.min(odds, SPECIAL_CAP)
  return 8 + 2.5 * Math.sqrt(capped - 1)
}

/** Special category points: 6 + 1.5 × √(min(odds, 51) − 1) */
export function specialPts(odds: number): number {
  const capped = Math.min(odds, SPECIAL_CAP)
  return 6 + 1.5 * Math.sqrt(capped - 1)
}

/** Knockout base points: 7 + 2 × √(min(odds, 51) − 1) */
export function koBase(odds: number): number {
  const capped = Math.min(odds, SPECIAL_CAP)
  return 7 + 2 * Math.sqrt(capped - 1)
}

/** Knockout points with round multiplier */
export function koPts(odds: number, round: MatchStage | string): number {
  const mult = KO_MULT[round] ?? 1.0
  return koBase(odds) * mult
}

/** Apply joker multiplier */
export function applyJoker(pts: number, isJoker: boolean): number {
  return isJoker ? pts * JOKER_MULT : pts
}

// ── Group scoring ────────────────────────────────────────────────

export interface GroupPickResult {
  groupLetter: string
  teamId: number
  predictedPosition: number
  actualPosition: number | null
  odds: number
  isJoker: boolean
}

/**
 * Score a single group pick.
 * 1st place = 100%, 2nd place = 10%, Eliminated = 0
 */
export function scoreGroupPick(pick: GroupPickResult): number {
  if (pick.actualPosition === null) return 0

  let multiplier = 0
  if (pick.predictedPosition === 1 && pick.actualPosition === 1) {
    multiplier = 1.0
  } else if (pick.predictedPosition === 1 && pick.actualPosition === 2) {
    multiplier = 0.1
  } else if (pick.predictedPosition === 2 && pick.actualPosition === 2) {
    multiplier = 1.0
  } else if (pick.predictedPosition === 2 && pick.actualPosition === 1) {
    multiplier = 0.1
  }
  // position > 2 = eliminated = 0

  const base = groupPts(pick.odds) * multiplier
  return applyJoker(base, pick.isJoker)
}

/**
 * Score all group picks for a player.
 * Best 7 of up to 10 count. Worst 3 auto-dropped.
 */
export function scoreAllGroupPicks(picks: GroupPickResult[]): {
  total: number
  kept: GroupPickResult[]
  dropped: GroupPickResult[]
  breakdown: { pick: GroupPickResult; points: number }[]
} {
  const scored = picks.map((pick) => ({
    pick,
    points: scoreGroupPick(pick),
  }))

  // Sort descending by points
  scored.sort((a, b) => b.points - a.points)

  const kept = scored.slice(0, 7)
  const dropped = scored.slice(7)
  const total = kept.reduce((sum, s) => sum + s.points, 0)

  return {
    total: round2(total),
    kept: kept.map((s) => s.pick),
    dropped: dropped.map((s) => s.pick),
    breakdown: scored,
  }
}

// ── Knockout scoring ─────────────────────────────────────────────

export interface KnockoutPickResult {
  matchId: number
  teamId: number
  round: MatchStage | string
  odds: number
  isJoker: boolean
  correct: boolean
}

/** Score a single knockout pick */
export function scoreKnockoutPick(pick: KnockoutPickResult): number {
  if (!pick.correct) return 0
  const base = koPts(pick.odds, pick.round)
  return applyJoker(base, pick.isJoker)
}

/** Score all knockout picks for a player */
export function scoreAllKnockoutPicks(
  picks: KnockoutPickResult[]
): { total: number; breakdown: { pick: KnockoutPickResult; points: number }[] } {
  const breakdown = picks.map((pick) => ({
    pick,
    points: scoreKnockoutPick(pick),
  }))
  const total = breakdown.reduce((sum, s) => sum + s.points, 0)
  return { total: round2(total), breakdown }
}

// ── Special scoring ──────────────────────────────────────────────

export interface SpecialPickResult {
  pickType: string
  odds: number
  isJoker: boolean
  correct: boolean
  isOutright?: boolean
}

/** Score a single special pick */
export function scoreSpecialPick(pick: SpecialPickResult): number {
  if (!pick.correct) return 0
  const base = pick.isOutright ? outrightPts(pick.odds) : specialPts(pick.odds)
  return applyJoker(base, pick.isJoker)
}

/** Score all special picks for a player */
export function scoreAllSpecialPicks(
  picks: SpecialPickResult[]
): { total: number; breakdown: { pick: SpecialPickResult; points: number }[] } {
  const breakdown = picks.map((pick) => ({
    pick,
    points: scoreSpecialPick(pick),
  }))
  const total = breakdown.reduce((sum, s) => sum + s.points, 0)
  return { total: round2(total), breakdown }
}

// ── Novelty scoring ──────────────────────────────────────────────

export interface NoveltyPickResult {
  pickType: string
  correct: boolean
}

/** Score a single novelty pick */
export function scoreNoveltyPick(pick: NoveltyPickResult): number {
  if (!pick.correct) return 0
  return NOVELTY_PTS[pick.pickType] ?? 0
}

/** Score all novelty picks for a player */
export function scoreAllNoveltyPicks(
  picks: NoveltyPickResult[]
): { total: number; breakdown: { pick: NoveltyPickResult; points: number }[] } {
  const breakdown = picks.map((pick) => ({
    pick,
    points: scoreNoveltyPick(pick),
  }))
  const total = breakdown.reduce((sum, s) => sum + s.points, 0)
  return { total: round2(total), breakdown }
}

// ── Total scoring ────────────────────────────────────────────────

export interface PlayerTotalScore {
  groupPoints: number
  knockoutPoints: number
  specialPoints: number
  noveltyPoints: number
  totalPoints: number
}

export function calculateTotalScore(
  groupPicks: GroupPickResult[],
  knockoutPicks: KnockoutPickResult[],
  specialPicks: SpecialPickResult[],
  noveltyPicks: NoveltyPickResult[]
): PlayerTotalScore {
  const groupPoints = scoreAllGroupPicks(groupPicks).total
  const knockoutPoints = scoreAllKnockoutPicks(knockoutPicks).total
  const specialPoints = scoreAllSpecialPicks(specialPicks).total
  const noveltyPoints = scoreAllNoveltyPicks(noveltyPicks).total

  return {
    groupPoints,
    knockoutPoints,
    specialPoints,
    noveltyPoints,
    totalPoints: round2(groupPoints + knockoutPoints + specialPoints + noveltyPoints),
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
