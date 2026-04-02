import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  calculateTotalScore,
  type GroupPickResult,
  type KnockoutPickResult,
  type SpecialPickResult,
  type NoveltyPickResult,
} from '@/lib/scoring'

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

type SupabaseClient = ReturnType<typeof createServiceClient>

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Fetch all players with their game_id
    const { data: players, error: playersErr } = await supabase
      .from('players')
      .select('id, game_id')

    if (playersErr) {
      console.error('[cron/score-update] players fetch error:', playersErr)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    const playerList = players ?? []
    let updated = 0
    let errors = 0

    for (const player of playerList) {
      try {
        await recalculatePlayerScore(supabase, player.id, player.game_id)
        updated++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[cron/score-update] error for player ${player.id}:`, msg)
        errors++
      }
    }

    // Assign ranks within each game
    const gameIds = Array.from(new Set(playerList.map((p: { game_id: string }) => p.game_id)))
    for (const game_id of gameIds) {
      await assignRanks(supabase, game_id)
    }

    return NextResponse.json({ updated, errors, total: playerList.length })
  } catch (err) {
    console.error('[cron/score-update] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function recalculatePlayerScore(
  supabase: SupabaseClient,
  player_id: string,
  game_id: string
): Promise<void> {
  // ── Group picks ──────────────────────────────────────────────────────────
  const { data: rawGroupPicks } = await supabase
    .from('group_picks')
    .select('group_letter, team_id, position, is_joker')
    .eq('player_id', player_id)

  const groupPickResults: GroupPickResult[] = []

  for (const gp of rawGroupPicks ?? []) {
    const { data: standing } = await supabase
      .from('group_standings')
      .select('position')
      .eq('team_id', gp.team_id)
      .eq('group_letter', gp.group_letter)
      .maybeSingle()

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
      .select('stage, home_team_id, away_team_id')
      .eq('id', kp.match_id)
      .maybeSingle()

    const { data: result } = await supabase
      .from('match_results')
      .select('winner_team_id, home_odds, away_odds')
      .eq('match_id', kp.match_id)
      .maybeSingle()

    let odds = 2.0
    if (result && match) {
      if (kp.team_id === match.home_team_id && result.home_odds != null) {
        odds = result.home_odds
      } else if (kp.team_id === match.away_team_id && result.away_odds != null) {
        odds = result.away_odds
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

      if (sp.pick_type === 'tournament_winner') {
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
      // runner_up, golden_boot, young_player, golden_glove — settled externally
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

  const noveltyPickResults: NoveltyPickResult[] = (rawNoveltyPicks ?? []).map((np) => ({
    pickType: np.pick_type,
    correct: false, // novelty picks settled externally
  }))

  // ── Calculate total ───────────────────────────────────────────────────────
  const totalScore = calculateTotalScore(
    groupPickResults,
    knockoutPickResults,
    specialPickResults,
    noveltyPickResults
  )

  // ── Upsert player_scores ──────────────────────────────────────────────────
  const { error: upsertError } = await supabase
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

  if (upsertError) {
    throw new Error(`upsert player_scores failed: ${upsertError.message}`)
  }
}

async function assignRanks(supabase: SupabaseClient, game_id: string) {
  const { data: scores } = await supabase
    .from('player_scores')
    .select('id, total_points')
    .eq('game_id', game_id)
    .order('total_points', { ascending: false })

  if (!scores || scores.length === 0) return

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
