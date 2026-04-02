import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { MatchStage, MatchStatus } from '@/types/database'

// football-data.org stage codes → our MatchStage
const STAGE_MAP: Record<string, MatchStage> = {
  'GROUP_STAGE': 'GROUP',
  'ROUND_OF_32': 'R32',
  'ROUND_OF_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': 'THIRD',
  'FINAL': 'FINAL',
}

// football-data.org status codes → our MatchStatus
const STATUS_MAP: Record<string, MatchStatus> = {
  'SCHEDULED': 'SCHEDULED',
  'TIMED': 'TIMED',
  'IN_PLAY': 'IN_PLAY',
  'PAUSED': 'PAUSED',
  'FINISHED': 'FINISHED',
  'POSTPONED': 'POSTPONED',
  'CANCELLED': 'CANCELLED',
  'SUSPENDED': 'SUSPENDED',
  'AWARDED': 'AWARDED',
}

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY not configured' }, { status: 500 })
  }

  try {
    // Fetch all matches for the WC competition from football-data.org
    const response = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches',
      {
        headers: { 'X-Auth-Token': apiKey },
        // 30 second timeout
        signal: AbortSignal.timeout(30_000),
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('[cron/match-sync] football-data API error:', response.status, errText)
      return NextResponse.json(
        { error: `football-data.org API returned ${response.status}` },
        { status: 502 }
      )
    }

    const json = await response.json()
    const matches: unknown[] = json?.matches ?? []

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No matches returned from API' })
    }

    const supabase = createServiceClient()

    // First, build a team name → id map from our DB
    const { data: teams } = await supabase
      .from('teams')
      .select('*')

    const teamByFifaId = new Map<number, number>()
    const teamByName = new Map<string, number>()
    for (const t of (teams ?? []) as Array<{ id: number; name: string; fifa_id: number | null }>) {
      if (t.fifa_id != null) teamByFifaId.set(t.fifa_id, t.id)
      teamByName.set(t.name.toLowerCase(), t.id)
    }

    const resolveTeam = (team: Record<string, unknown> | null): number | null => {
      if (!team) return null
      if (typeof team.id === 'number' && teamByFifaId.has(team.id)) {
        return teamByFifaId.get(team.id)!
      }
      const nameKey = String(team.name ?? '').toLowerCase()
      return teamByName.get(nameKey) ?? null
    }

    let synced = 0
    let errors = 0

    for (const rawMatch of matches) {
      const m = rawMatch as Record<string, unknown>

      const externalId = typeof m.id === 'number' ? m.id : null
      if (!externalId) continue

      const rawStage = String((m as Record<string, unknown> & { stage?: unknown }).stage ?? '')
      const stage: MatchStage = STAGE_MAP[rawStage] ?? 'GROUP'

      const rawStatus = String(m.status ?? '')
      const status: MatchStatus = STATUS_MAP[rawStatus] ?? 'SCHEDULED'

      const kickoffUtc = String(m.utcDate ?? '')
      if (!kickoffUtc) continue

      const homeTeam = m.homeTeam as Record<string, unknown> | null
      const awayTeam = m.awayTeam as Record<string, unknown> | null

      const homeTeamId = resolveTeam(homeTeam)
      const awayTeamId = resolveTeam(awayTeam)

      const score = m.score as Record<string, unknown> | null
      const fullTime = score?.fullTime as Record<string, unknown> | null
      const homeScore =
        typeof fullTime?.home === 'number' ? fullTime.home : null
      const awayScore =
        typeof fullTime?.away === 'number' ? fullTime.away : null

      // Derive group_letter and matchday from season/matchday info
      const groupLetter = (m.group as string | null) ?? null
      const matchday = typeof m.matchday === 'number' ? m.matchday : null

      const venue = (m as Record<string, unknown> & { venue?: unknown }).venue
      const venueStr = typeof venue === 'string' ? venue : null

      // Check if match already exists by external_id
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await supabase
          .from('matches')
          .update({
            stage,
            status,
            kickoff_utc: kickoffUtc,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: homeScore,
            away_score: awayScore,
            group_letter: groupLetter,
            matchday,
            venue: venueStr,
          })
          .eq('id', existing.id)

        if (updateErr) {
          console.error(`[cron/match-sync] update error for match ${externalId}:`, updateErr)
          errors++
        } else {
          // If finished, upsert match result
          if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
            await upsertMatchResult(supabase, existing.id, homeTeamId, awayTeamId, homeScore, awayScore)
          }
          synced++
        }
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('matches')
          .insert({
            external_id: externalId,
            stage,
            status,
            kickoff_utc: kickoffUtc,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: homeScore,
            away_score: awayScore,
            group_letter: groupLetter,
            matchday,
            venue: venueStr,
          })
          .select('id')
          .single()

        if (insertErr) {
          console.error(`[cron/match-sync] insert error for match ${externalId}:`, insertErr)
          errors++
        } else {
          if (status === 'FINISHED' && homeScore !== null && awayScore !== null && inserted) {
            await upsertMatchResult(supabase, inserted.id, homeTeamId, awayTeamId, homeScore, awayScore)
          }
          synced++
        }
      }
    }

    return NextResponse.json({ synced, errors, total: matches.length })
  } catch (err) {
    console.error('[cron/match-sync] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

type SupabaseClient = ReturnType<typeof createServiceClient>

async function upsertMatchResult(
  supabase: SupabaseClient,
  matchId: number,
  homeTeamId: number | null,
  awayTeamId: number | null,
  homeScore: number,
  awayScore: number
) {
  let winnerTeamId: number | null = null
  if (homeScore > awayScore) {
    winnerTeamId = homeTeamId
  } else if (awayScore > homeScore) {
    winnerTeamId = awayTeamId
  }
  // Draw: winnerTeamId stays null

  await supabase
    .from('match_results')
    .upsert(
      {
        match_id: matchId,
        winner_team_id: winnerTeamId,
        settled_at: new Date().toISOString(),
      },
      { onConflict: 'match_id' }
    )
}
