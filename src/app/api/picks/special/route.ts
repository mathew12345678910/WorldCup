import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { specialPickSchema } from '@/lib/validation'

// These pick types require a team_id
const TEAM_PICK_TYPES = new Set(['tournament_winner', 'runner_up', 'group_stage_exit'])
// These pick types require a player_name
const PLAYER_NAME_PICK_TYPES = new Set(['golden_boot', 'young_player', 'golden_glove'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = specialPickSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { player_id, pick_type, team_id, player_name, is_joker } = parsed.data

    // Semantic validation
    if (TEAM_PICK_TYPES.has(pick_type) && team_id == null) {
      return NextResponse.json(
        { error: `pick_type '${pick_type}' requires a team_id` },
        { status: 400 }
      )
    }
    if (PLAYER_NAME_PICK_TYPES.has(pick_type) && !player_name) {
      return NextResponse.json(
        { error: `pick_type '${pick_type}' requires a player_name` },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('id', player_id)
      .maybeSingle()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check if existing pick for this type is locked
    const { data: existingPick, error: existingError } = await supabase
      .from('special_picks')
      .select('id, locked')
      .eq('player_id', player_id)
      .eq('pick_type', pick_type)
      .maybeSingle()

    if (existingError) {
      console.error('[picks/special/POST] existing pick error:', existingError)
      return NextResponse.json({ error: 'Failed to check existing pick' }, { status: 500 })
    }

    if (existingPick?.locked) {
      return NextResponse.json({ error: 'This pick is locked and cannot be changed' }, { status: 409 })
    }

    // Upsert (unique on player_id + pick_type)
    const { data: upserted, error: upsertError } = await supabase
      .from('special_picks')
      .upsert(
        {
          player_id,
          pick_type,
          team_id: team_id ?? null,
          player_name: player_name ?? null,
          is_joker,
          locked: false,
        },
        { onConflict: 'player_id,pick_type' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[picks/special/POST] upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 })
    }

    return NextResponse.json({ pick: upserted }, { status: 200 })
  } catch (err) {
    console.error('[picks/special/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
