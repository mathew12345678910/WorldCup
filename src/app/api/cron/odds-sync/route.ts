import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

type SupabaseClient = ReturnType<typeof createServiceClient>

interface OddsApiBookmaker {
  key: string
  title: string
  markets: OddsApiMarket[]
}

interface OddsApiMarket {
  key: string
  outcomes: OddsApiOutcome[]
}

interface OddsApiOutcome {
  name: string
  price: number
}

interface OddsApiEvent {
  id: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  // Fetch all upcoming/in-play matches from DB to sync odds for
  const { data: matches, error: matchesErr } = await supabase
    .from('matches')
    .select('id, external_id, home_team_id, away_team_id, stage, status, kickoff_utc')
    .in('status', ['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED'])

  if (matchesErr) {
    console.error('[cron/odds-sync] matches fetch error:', matchesErr)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }

  // Fetch teams map
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  const teamByName = new Map<string, number>()
  for (const t of teams ?? []) {
    teamByName.set(t.name.toLowerCase(), t.id)
  }

  let synced = 0
  let fallbackUsed = false

  try {
    // Fetch from The Odds API — soccer_fifa_world_cup, h2h market, decimal odds, uk region
    const oddsUrl = new URL('https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds')
    oddsUrl.searchParams.set('apiKey', oddsApiKey)
    oddsUrl.searchParams.set('markets', 'h2h')
    oddsUrl.searchParams.set('oddsFormat', 'decimal')
    oddsUrl.searchParams.set('regions', 'uk')

    const oddsResponse = await fetch(oddsUrl.toString(), {
      signal: AbortSignal.timeout(30_000),
    })

    if (oddsResponse.ok) {
      const events: OddsApiEvent[] = await oddsResponse.json()
      synced = await processOddsApiEvents(supabase, events, matches ?? [], teamByName)
    } else {
      console.warn(
        `[cron/odds-sync] The Odds API returned ${oddsResponse.status}, falling back to BallDontLie`
      )
      synced = await fallbackBallDontLie(supabase, matches ?? [], teamByName)
      fallbackUsed = true
    }
  } catch (err) {
    console.error('[cron/odds-sync] Odds API fetch error:', err)
    // Fall back to BallDontLie
    try {
      synced = await fallbackBallDontLie(supabase, matches ?? [], teamByName)
      fallbackUsed = true
    } catch (fallbackErr) {
      console.error('[cron/odds-sync] BallDontLie fallback error:', fallbackErr)
      return NextResponse.json({ error: 'Both odds sources failed' }, { status: 502 })
    }
  }

  return NextResponse.json({ synced, fallbackUsed })
}

type DbMatch = {
  id: number
  external_id: number | null
  home_team_id: number | null
  away_team_id: number | null
  stage: string
  status: string
  kickoff_utc: string
}

async function processOddsApiEvents(
  supabase: SupabaseClient,
  events: OddsApiEvent[],
  matches: DbMatch[],
  teamByName: Map<string, number>
): Promise<number> {
  let synced = 0

  for (const event of events) {
    // Find matching DB match by home/away team name
    const homeId = teamByName.get(event.home_team.toLowerCase())
    const awayId = teamByName.get(event.away_team.toLowerCase())

    if (!homeId || !awayId) continue

    const dbMatch = matches.find(
      (m) => m.home_team_id === homeId && m.away_team_id === awayId
    )
    if (!dbMatch) continue

    // Average h2h odds across all bookmakers
    const homeOddsArr: number[] = []
    const awayOddsArr: number[] = []
    const drawOddsArr: number[] = []

    for (const bookmaker of event.bookmakers) {
      const h2h = bookmaker.markets.find((mk) => mk.key === 'h2h')
      if (!h2h) continue
      for (const outcome of h2h.outcomes) {
        const nameLower = outcome.name.toLowerCase()
        if (nameLower === event.home_team.toLowerCase()) {
          homeOddsArr.push(outcome.price)
        } else if (nameLower === event.away_team.toLowerCase()) {
          awayOddsArr.push(outcome.price)
        } else if (nameLower === 'draw') {
          drawOddsArr.push(outcome.price)
        }
      }
    }

    const avgHome = homeOddsArr.length > 0 ? average(homeOddsArr) : null
    const avgAway = awayOddsArr.length > 0 ? average(awayOddsArr) : null
    const avgDraw = drawOddsArr.length > 0 ? average(drawOddsArr) : null

    const { error: upsertErr } = await supabase
      .from('match_results')
      .upsert(
        {
          match_id: dbMatch.id,
          home_odds: avgHome,
          away_odds: avgAway,
          draw_odds: avgDraw,
          odds_source: 'the-odds-api',
          odds_updated_at: new Date().toISOString(),
        },
        { onConflict: 'match_id' }
      )

    if (upsertErr) {
      console.error(`[cron/odds-sync] upsert error for match ${dbMatch.id}:`, upsertErr)
    } else {
      synced++
    }
  }

  return synced
}

async function fallbackBallDontLie(
  supabase: SupabaseClient,
  matches: DbMatch[],
  teamByName: Map<string, number>
): Promise<number> {
  const ballDontLieKey = process.env.BALLDONTLIE_API_KEY
  // BallDontLie doesn't cover soccer odds natively; we use it as a placeholder
  // for fetching any available soccer data. If no key, skip gracefully.
  if (!ballDontLieKey) {
    console.warn('[cron/odds-sync] BALLDONTLIE_API_KEY not set, skipping fallback')
    return 0
  }

  // BallDontLie free-tier soccer endpoint (if available)
  // Since BallDontLie primarily covers NBA/NFL, we attempt a generic fetch
  // and record that the fallback was used with placeholder odds.
  let synced = 0

  try {
    const response = await fetch(
      'https://api.balldontlie.io/v1/games?sport=soccer',
      {
        headers: { Authorization: ballDontLieKey },
        signal: AbortSignal.timeout(15_000),
      }
    )

    if (!response.ok) {
      console.warn(`[cron/odds-sync] BallDontLie returned ${response.status}`)
      return 0
    }

    const json = await response.json()
    const games = json?.data ?? []

    for (const game of games) {
      const homeTeamName = String(game?.home_team?.full_name ?? game?.home_team?.name ?? '').toLowerCase()
      const awayTeamName = String(game?.visitor_team?.full_name ?? game?.visitor_team?.name ?? '').toLowerCase()

      const homeId = teamByName.get(homeTeamName)
      const awayId = teamByName.get(awayTeamName)
      if (!homeId || !awayId) continue

      const dbMatch = matches.find(
        (m) => m.home_team_id === homeId && m.away_team_id === awayId
      )
      if (!dbMatch) continue

      // BallDontLie doesn't provide pre-match odds; record source only
      const { error: upsertErr } = await supabase
        .from('match_results')
        .upsert(
          {
            match_id: dbMatch.id,
            odds_source: 'balldontlie',
            odds_updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id' }
        )

      if (!upsertErr) synced++
    }
  } catch (err) {
    console.error('[cron/odds-sync] BallDontLie fetch error:', err)
  }

  return synced
}

function average(arr: number[]): number {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}
