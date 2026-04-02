import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/selections?game_id=<uuid>
 * Returns all players and their picks for a given game.
 * Requires X-Admin-Password header matching ADMIN_PASSWORD env var.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const password = request.headers.get('x-admin-password')
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const game_id = searchParams.get('game_id')

    if (!game_id) {
      return NextResponse.json({ error: 'game_id query param is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, name, pin')
      .eq('id', game_id)
      .maybeSingle()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Fetch all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, avatar_color, has_paid, joined_at')
      .eq('game_id', game_id)
      .order('joined_at', { ascending: true })

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    const playerList = players ?? []
    if (playerList.length === 0) {
      return NextResponse.json({ game, players: [] })
    }

    const playerIds = playerList.map((p) => p.id)

    // Fetch all picks in parallel
    const [
      { data: groupPicks },
      { data: specialPicks },
      { data: noveltyPicks },
      { data: knockoutPicks },
    ] = await Promise.all([
      supabase
        .from('group_picks')
        .select('player_id, group_letter, team_id, position, is_joker, locked')
        .in('player_id', playerIds),
      supabase
        .from('special_picks')
        .select('player_id, pick_type, team_id, player_name, is_joker, locked')
        .in('player_id', playerIds),
      supabase
        .from('novelty_picks')
        .select('player_id, pick_type, value, locked')
        .in('player_id', playerIds),
      supabase
        .from('knockout_picks')
        .select('player_id, match_id, team_id, is_joker, locked')
        .in('player_id', playerIds),
    ])

    // Group picks by player_id
    const groupPicksByPlayer: Record<string, typeof groupPicks> = {}
    const specialPicksByPlayer: Record<string, typeof specialPicks> = {}
    const noveltyPicksByPlayer: Record<string, typeof noveltyPicks> = {}
    const knockoutPicksByPlayer: Record<string, typeof knockoutPicks> = {}

    for (const pick of groupPicks ?? []) {
      if (!groupPicksByPlayer[pick.player_id]) groupPicksByPlayer[pick.player_id] = []
      groupPicksByPlayer[pick.player_id]!.push(pick)
    }
    for (const pick of specialPicks ?? []) {
      if (!specialPicksByPlayer[pick.player_id]) specialPicksByPlayer[pick.player_id] = []
      specialPicksByPlayer[pick.player_id]!.push(pick)
    }
    for (const pick of noveltyPicks ?? []) {
      if (!noveltyPicksByPlayer[pick.player_id]) noveltyPicksByPlayer[pick.player_id] = []
      noveltyPicksByPlayer[pick.player_id]!.push(pick)
    }
    for (const pick of knockoutPicks ?? []) {
      if (!knockoutPicksByPlayer[pick.player_id]) knockoutPicksByPlayer[pick.player_id] = []
      knockoutPicksByPlayer[pick.player_id]!.push(pick)
    }

    const playersWithPicks = playerList.map((player) => ({
      ...player,
      group_picks: groupPicksByPlayer[player.id] ?? [],
      special_picks: specialPicksByPlayer[player.id] ?? [],
      novelty_picks: noveltyPicksByPlayer[player.id] ?? [],
      knockout_picks: knockoutPicksByPlayer[player.id] ?? [],
    }))

    return NextResponse.json({ game, players: playersWithPicks })
  } catch (err) {
    console.error('[admin/selections] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
