import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/seed-odds
 * Inserts/upserts realistic outright winner odds for all 48 teams,
 * plus group_winner market odds.
 * Requires { password } matching ADMIN_PASSWORD env var.
 */

// Outright tournament winner odds (decimal) — keyed by team code
const WINNER_ODDS: Record<string, number> = {
  // Top favourites
  BRA: 4.5,
  ARG: 5.0,
  FRA: 5.5,
  ENG: 7.0,
  ESP: 8.0,
  GER: 9.0,
  POR: 10.0,
  NED: 15.0,
  BEL: 20.0,
  ITA: 25.0,
  USA: 30.0,
  URU: 35.0,
  CRO: 40.0,
  COL: 45.0,
  MEX: 50.0,
  DEN: 55.0,
  JPN: 60.0,
  KOR: 65.0,
  SUI: 70.0,
  MAR: 75.0,
  // Remaining 28 teams — spread across 100–200
  SRB: 100.0,
  CAN: 100.0,
  AUS: 100.0,
  POL: 100.0,
  SEN: 110.0,
  NGR: 110.0,
  NGA: 110.0,
  EGY: 120.0,
  CHI: 120.0,
  ECU: 125.0,
  GHA: 125.0,
  ALG: 130.0,
  PAR: 140.0,
  PER: 140.0,
  IRN: 150.0,
  CMR: 150.0,
  TUN: 150.0,
  SCO: 150.0,
  WAL: 150.0,
  HON: 175.0,
  CRC: 175.0,
  KSA: 175.0,
  SAU: 175.0,
  CIV: 175.0,
  MLI: 175.0,
  NZL: 200.0,
  JAM: 200.0,
  PAN: 200.0,
  QAT: 200.0,
  TRI: 200.0,
  BOL: 200.0,
  VEN: 200.0,
  SLV: 200.0,
}

// Group winner odds — favourites at 1.5–2.5, mid at 3.0–5.0, underdogs at 6.0–15.0
// Key format: "<GROUP_LETTER>:<TEAM_CODE>"
const GROUP_WINNER_ODDS: Record<string, number> = {
  // Group A — example top pick at 1.75, second at 3.5, rest at 6–10
  'A:BRA': 1.5,
  'A:ARG': 3.0,
  'A:ENG': 7.0,
  'A:URU': 9.0,

  // Group B
  'B:FRA': 1.6,
  'B:POR': 3.5,
  'B:COL': 6.0,
  'B:ECU': 12.0,

  // Group C
  'C:ENG': 1.75,
  'C:GER': 2.5,
  'C:MEX': 6.5,
  'C:HON': 15.0,

  // Group D
  'D:ESP': 1.6,
  'D:NED': 3.5,
  'D:USA': 5.0,
  'D:PAN': 14.0,

  // Group E
  'E:BEL': 1.8,
  'E:CRO': 3.0,
  'E:MAR': 5.5,
  'E:CAN': 9.0,

  // Group F
  'F:ITA': 2.0,
  'F:SUI': 3.5,
  'F:SEN': 5.0,
  'F:TUN': 11.0,

  // Group G
  'G:POR': 1.65,
  'G:URU': 3.0,
  'G:JPN': 6.0,
  'G:KSA': 13.0,

  // Group H
  'H:GER': 1.7,
  'H:DEN': 3.0,
  'H:KOR': 6.5,
  'H:NZL': 14.0,

  // Group I
  'I:ARG': 1.5,
  'I:COL': 3.5,
  'I:SRB': 7.0,
  'I:GHA': 10.0,

  // Group J
  'J:ENG': 1.6,
  'J:SUI': 3.5,
  'J:AUS': 7.0,
  'J:BOL': 14.0,

  // Group K
  'K:FRA': 1.55,
  'K:NED': 3.0,
  'K:POL': 6.0,
  'K:CRC': 15.0,

  // Group L
  'L:ESP': 1.6,
  'L:MEX': 3.5,
  'L:CHI': 7.0,
  'L:CMR': 12.0,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || body.password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Fetch all teams (id, code, group_letter)
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, code, group_letter')

    if (teamsError || !teams) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    // ── Build tournament_winner odds rows ─────────────────────────────────────
    const winnerRows: { team_id: number; market: string; decimal_odds: number; source: string }[] = []

    for (const team of teams) {
      const odds = WINNER_ODDS[team.code]
      if (odds != null) {
        winnerRows.push({
          team_id: team.id,
          market: 'tournament_winner',
          decimal_odds: odds,
          source: 'seed',
        })
      }
    }

    // ── Build group_winner odds rows ──────────────────────────────────────────
    const groupWinnerRows: { team_id: number; market: string; decimal_odds: number; source: string }[] = []

    for (const team of teams) {
      if (!team.group_letter) continue
      const key = `${team.group_letter}:${team.code}`
      const odds = GROUP_WINNER_ODDS[key]
      if (odds != null) {
        groupWinnerRows.push({
          team_id: team.id,
          market: 'group_winner',
          decimal_odds: odds,
          source: 'seed',
        })
      }
    }

    const allRows = [...winnerRows, ...groupWinnerRows]

    if (allRows.length === 0) {
      return NextResponse.json({ error: 'No matching teams found — check team codes in DB' }, { status: 404 })
    }

    // Upsert all rows (unique on team_id, market per the outright_odds table constraints)
    const { error: upsertError } = await supabase
      .from('outright_odds')
      .upsert(allRows as Record<string, unknown>[], { onConflict: 'team_id,market' })

    if (upsertError) {
      console.error('[seed-odds] upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to seed odds', details: upsertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      seeded: {
        tournament_winner: winnerRows.length,
        group_winner: groupWinnerRows.length,
        total: allRows.length,
      },
    })
  } catch (err) {
    console.error('[seed-odds] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
