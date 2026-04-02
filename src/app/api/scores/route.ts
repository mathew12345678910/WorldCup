import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  calculateTotalScore,
  type GroupPickResult,
  type KnockoutPickResult,
  type SpecialPickResult,
  type NoveltyPickResult,
} from '@/lib/scoring'

/**
 * GET /api/scores?game_id=<uuid>
 * Returns leaderboard: all player scores sorted by total_points desc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game_id = searchParams.get('game_id')

    if (!game_id) {
      return NextResponse.json({ error: 'game_id query param is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verify game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, name')
      .eq('id', game_id)
      .maybeSingle()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Fetch all player scores for this game, joined with player info
    const { data: scores, error: scoresError } = await supabase
      .from('player_scores')
      .select(`
        id,
        player_id,
        game_id,
        group_points,
        knockout_points,
        special_points,
        novelty_points,
        total_points,
        rank,
        updated_at,
        players (
          id,
          name,
          avatar_color,
          has_paid
        )
      `)
      .eq('game_id', game_id)
      .order('total_points', { ascending: false })

    if (scoresError) {
      console.error('[scores/GET] query error:', scoresError)
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
    }

    return NextResponse.json({ game, leaderboard: scores ?? [] })
  } catch (err) {
    console.error('[scores/GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/scores?game_id=<uuid>
 * Triggers score recalculation for all players in the game.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game_id = searchParams.get('game_id')

    if (!game_id) {
      return NextResponse.json({ error: 'game_id query param is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', game_id)
      .maybeSingle()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Fetch all players for this game
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game_id)

    if (playersError) {
      console.error('[scores/POST] players fetch error:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    const playerList = players ?? []
    const results: { player_id: string; updated: boolean; error?: string }[] = []

    for (const player of playerList) {
      try {
        const score = await recalculatePlayerScore(supabase, player.id, game_id)
        results.push({ player_id: player.id, updated: score !== null })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[scores/POST] error for player ${player.id}:`, msg)
        results.push({ player_id: player.id, updated: false, error: msg })
      }
    }

    // Recompute ranks
    await assignRanks(supabase, game_id)

    return NextResponse.json({
      recalculated: results.filter((r) => r.updated).length,
      errors: results.filter((r) => !r.updated).length,
      results,
    })
  } catch (err) {
    console.error('[scores/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createServiceClient>

async function recalculatePlayerScore(
  supabase: SupabaseClient,
  player_id: string,
  game_id: string
): Promise<object | null> {
  // ── Group picks ──────────────────────────────────────────────────────────
  const { data: rawGroupPicks } = await supabase
    .from('group_picks')
    .select('group_letter, team_id, position, is_joker')
    .eq('player_id', player_id)

  const groupPickResults: GroupPickResult[] = []

  for (const gp of rawGroupPicks ?? []) {
    // Get group standing for this team
    const { data: standing } = await supabase
      .from('group_standings')
      .select('position')
      .eq('team_id', gp.team_id)
      .eq('group_letter', gp.group_letter)
      .maybeSingle()

    // Get outright odds for this team
    const { data: oddsRow } = await supabase
      .from('outright_odds')
      .select('decimal_odds')
      .eq('team_id', gp.team_id)
      .eq('market', 'tournament_winner')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    groupPickResults.push({
      groupLetter: gp.group_letter,
      teamId: gp.team_id,
      predictedPosition: gp.position,
      actualPosition: standing?.position ?? null,
      odds: oddsRow?.decimal_odds ?? 1.5,
      isJoker: gp.is_joker,
    })
  }

  // ── Knockout picks ────────────────────────────────────────────────────────
  const { data: rawKoPicks } = await supabase
    .from('knockout_picks')
    .select('match_id, team_id, is_joker')
    .eq('player_id', player_id)

  const knockoutPickResults: KnockoutPickResult[] = []

  for (const kp of rawKoPicks ?? []) {
    const { data: match } = await supabase
      .from('matches')
      .select('stage')
      .eq('id', kp.match_id)
      .maybeSingle()

    const { data: result } = await supabase
      .from('match_results')
      .select('winner_team_id, settled_at')
      .eq('match_id', kp.match_id)
      .maybeSingle()

    const { data: oddsRow } = await supabase
      .from('match_results')
      .select('home_odds, away_odds')
      .eq('match_id', kp.match_id)
      .maybeSingle()

    // Determine odds for the chosen team
    const { data: matchDetail } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id')
      .eq('id', kp.match_id)
      .maybeSingle()

    let odds = 2.0
    if (oddsRow && matchDetail) {
      if (kp.team_id === matchDetail.home_team_id && oddsRow.home_odds != null) {
        odds = oddsRow.home_odds
      } else if (kp.team_id === matchDetail.away_team_id && oddsRow.away_odds != null) {
        odds = oddsRow.away_odds
      }
    }

    knockoutPickResults.push({
      matchId: kp.match_id,
      teamId: kp.team_id,
      round: match?.stage ?? 'R32',
      odds,
      isJoker: kp.is_joker,
      correct: result?.winner_team_id === kp.team_id,
    })
  }

  // ── Special picks ─────────────────────────────────────────────────────────
  const { data: rawSpecialPicks } = await supabase
    .from('special_picks')
    .select('pick_type, team_id, player_name, is_joker')
    .eq('player_id', player_id)

  const specialPickResults: SpecialPickResult[] = []

  for (const sp of rawSpecialPicks ?? []) {
    let correct = false
    let odds = 5.0
    const isOutright = sp.pick_type === 'tournament_winner' || sp.pick_type === 'runner_up'

    if (sp.team_id != null) {
      const { data: oddsRow } = await supabase
        .from('outright_odds')
        .select('decimal_odds')
        .eq('team_id', sp.team_id)
        .eq('market', sp.pick_type)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (oddsRow) odds = oddsRow.decimal_odds

      // Check correctness via group_standings for tournament_winner/runner_up
      if (sp.pick_type === 'tournament_winner') {
        // Winner is the team that won the FINAL match
        const { data: finalMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('stage', 'FINAL')
          .maybeSingle()
        if (finalMatch) {
          const { data: finalResult } = await supabase
            .from('match_results')
            .select('winner_team_id')
            .eq('match_id', finalMatch.id)
            .maybeSingle()
          correct = finalResult?.winner_team_id === sp.team_id
        }
      } else if (sp.pick_type === 'group_stage_exit') {
        // Team didn't qualify past the group stage (position > 2)
        const { data: teamInfo } = await supabase
          .from('teams')
          .select('group_letter')
          .eq('id', sp.team_id)
          .maybeSingle()
        if (teamInfo?.group_letter) {
          const { data: standing } = await supabase
            .from('group_standings')
            .select('position')
            .eq('team_id', sp.team_id)
            .eq('group_letter', teamInfo.group_letter)
            .maybeSingle()
          correct = (standing?.position ?? 0) > 2
        }
      }
    }

    specialPickResults.push({
      pickType: sp.pick_type,
      odds,
      isJoker: sp.is_joker,
      correct,
      isOutright,
    })
  }

  // ── Novelty picks ─────────────────────────────────────────────────────────
  const { data: rawNoveltyPicks } = await supabase
    .from('novelty_picks')
    .select('pick_type, value')
    .eq('player_id', player_id)

  // Novelty correctness is not auto-determinable from external data.
  // We mark correct = false until manually settled; scoring engine handles points = 0 for incorrect.
  const noveltyPickResults: NoveltyPickResult[] = (rawNoveltyPicks ?? []).map((np) => ({
    pickType: np.pick_type,
    correct: false, // settled externally
  }))

  // ── Calculate total ───────────────────────────────────────────────────────
  const totalScore = calculateTotalScore(
    groupPickResults,
    knockoutPickResults,
    specialPickResults,
    noveltyPickResults
  )

  // ── Upsert player_scores ──────────────────────────────────────────────────
  const { data: upserted, error: upsertError } = await supabase
    .from('player_scores')
    .upsert(
      {
        player_id,
        game_id,
        group_points: totalScore.groupPoints,
        knockout_points: totalScore.knockoutPoints,
        special_points: totalScore.specialPoints,
        novelty_points: totalScore.noveltyPoints,
        total_points: totalScore.totalPoints,
      },
      { onConflict: 'player_id,game_id' }
    )
    .select()
    .single()

  if (upsertError) {
    throw new Error(`upsert failed: ${upsertError.message}`)
  }

  return upserted
}

async function assignRanks(supabase: SupabaseClient, game_id: string) {
  const { data: scores } = await supabase
    .from('player_scores')
    .select('id, total_points')
    .eq('game_id', game_id)
    .order('total_points', { ascending: false })

  if (!scores) return

  let rank = 1
  for (let i = 0; i < scores.length; i++) {
    if (i > 0 && scores[i].total_points < scores[i - 1].total_points) {
      rank = i + 1
    }
    await supabase
      .from('player_scores')
      .update({ rank })
      .eq('id', scores[i].id)
  }
}
