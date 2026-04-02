import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { joinGameSchema } from '@/lib/validation'
import { randomBytes } from 'crypto'

const AVATAR_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
]

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/** GET /api/players?game_id=<uuid> — return all players for a game */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game_id = searchParams.get('game_id')

    if (!game_id) {
      return NextResponse.json({ error: 'game_id query param is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: players, error } = await supabase
      .from('players')
      .select('id, game_id, name, avatar_color, has_paid, joined_at')
      .eq('game_id', game_id)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('[players/GET] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    return NextResponse.json({ players })
  } catch (err) {
    console.error('[players/GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/players — join a game */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = joinGameSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, gamePin } = parsed.data
    const trimmedName = name.trim()

    const supabase = createServerSupabaseClient()

    // Look up game by PIN (case-insensitive)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, max_players, name')
      .ilike('pin', gamePin)
      .maybeSingle()

    if (gameError) {
      console.error('[players/POST] game lookup error:', gameError)
      return NextResponse.json({ error: 'Failed to look up game' }, { status: 500 })
    }

    if (!game) {
      return NextResponse.json({ error: 'Invalid game PIN' }, { status: 404 })
    }

    // Fetch existing players for this game
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, token, avatar_color')
      .eq('game_id', game.id)
      .order('joined_at', { ascending: true })

    if (playersError) {
      console.error('[players/POST] existing players error:', playersError)
      return NextResponse.json({ error: 'Failed to check existing players' }, { status: 500 })
    }

    // Check for returning player (case-insensitive name match)
    const returning = existingPlayers?.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (returning) {
      // Return existing player record (with token for re-auth)
      return NextResponse.json(
        { player: returning, game: { id: game.id, name: game.name }, returning: true },
        { status: 200 }
      )
    }

    // Enforce player cap
    const currentCount = existingPlayers?.length ?? 0
    if (currentCount >= (game.max_players ?? 20)) {
      return NextResponse.json({ error: 'This game is full (maximum 20 players)' }, { status: 409 })
    }

    // Assign avatar color by cycling through presets
    const avatar_color = AVATAR_COLORS[currentCount % AVATAR_COLORS.length]

    const token = generateToken()

    const { data: player, error: insertError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: trimmedName,
        token,
        avatar_color,
        has_paid: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[players/POST] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
    }

    return NextResponse.json(
      { player, game: { id: game.id, name: game.name }, returning: false },
      { status: 201 }
    )
  } catch (err) {
    console.error('[players/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
