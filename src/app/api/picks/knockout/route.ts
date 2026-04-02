import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { knockoutPickSchema } from '@/lib/validation'
import type { MatchStage } from '@/types/database'

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = knockoutPickSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { player_id, match_id, team_id, is_joker } = parsed.data
    const supabase = createServerSupabaseClient()

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, game_id')
      .eq('id', player_id)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, stage, kickoff_utc, home_team_id, away_team_id, status')
      .eq('id', match_id)
      .maybeSingle()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Validate it is a knockout stage match
    if (!KNOCKOUT_STAGES.includes(match.stage as MatchStage)) {
      return NextResponse.json(
        { error: 'Match is not a knockout stage match' },
        { status: 400 }
      )
    }

    // Validate kickoff hasn't passed
    const kickoff = new Date(match.kickoff_utc)
    const now = new Date()
    if (now >= kickoff) {
      return NextResponse.json(
        { error: 'Picks are locked — this match has already kicked off' },
        { status: 409 }
      )
    }

    // Validate that the chosen team is actually in this match
    // For early knockout rounds, home/away teams may be TBD (null)
    if (match.home_team_id !== null || match.away_team_id !== null) {
      if (team_id !== match.home_team_id && team_id !== match.away_team_id) {
        return NextResponse.json(
          { error: 'The selected team is not participating in this match' },
          { status: 400 }
        )
      }
    }

    // Check if existing pick for this slot is locked
    const { data: existingPick, error: existingError } = await supabase
      .from('knockout_picks')
      .select('id, is_joker, locked')
      .eq('player_id', player_id)
      .eq('match_id', match_id)
      .maybeSingle()

    if (existingError) {
      console.error('[picks/knockout/POST] existing pick error:', existingError)
      return NextResponse.json({ error: 'Failed to check existing pick' }, { status: 500 })
    }

    if (existingPick?.locked) {
      return NextResponse.json({ error: 'This pick is locked and cannot be changed' }, { status: 409 })
    }

    // Validate: only 1 joker per round
    if (is_joker) {
      const { data: roundPicks, error: roundError } = await supabase
        .from('knockout_picks')
        .select('id, match_id, is_joker')
        .eq('player_id', player_id)

      if (roundError) {
        console.error('[picks/knockout/POST] round picks error:', roundError)
        return NextResponse.json({ error: 'Failed to validate joker' }, { status: 500 })
      }

      // Get all match IDs for the same stage to check joker constraint within the round
      const { data: roundMatches, error: roundMatchError } = await supabase
        .from('matches')
        .select('id')
        .eq('stage', match.stage)

      if (roundMatchError) {
        console.error('[picks/knockout/POST] round match lookup error:', roundMatchError)
        return NextResponse.json({ error: 'Failed to validate joker' }, { status: 500 })
      }

      const roundMatchIds = new Set((roundMatches ?? []).map((m) => m.id))

      const jokerInRound = (roundPicks ?? []).find(
        (p) =>
          p.is_joker &&
          p.match_id !== match_id && // exclude the current pick being upserted
          roundMatchIds.has(p.match_id)
      )

      if (jokerInRound) {
        return NextResponse.json(
          { error: `You can only use 1 joker per round (${match.stage})` },
          { status: 400 }
        )
      }
    }

    // Upsert the pick (unique on player_id + match_id)
    const { data: upserted, error: upsertError } = await supabase
      .from('knockout_picks')
      .upsert(
        {
          player_id,
          match_id,
          team_id,
          is_joker,
          locked: false,
        },
        { onConflict: 'player_id,match_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[picks/knockout/POST] upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 })
    }

    return NextResponse.json({ pick: upserted }, { status: 200 })
  } catch (err) {
    console.error('[picks/knockout/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
