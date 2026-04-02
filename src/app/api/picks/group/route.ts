import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { groupPickSchema } from '@/lib/validation'

const MAX_GROUPS = 10
const MAX_FAVOURITES = 6 // max picks for the lowest-odds (favourite) team per player

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = groupPickSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { player_id, group_letter, team_id, position, is_joker } = parsed.data
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

    // Verify team belongs to this group
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, group_letter')
      .eq('id', team_id)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.group_letter !== group_letter) {
      return NextResponse.json(
        { error: `Team does not belong to group ${group_letter}` },
        { status: 400 }
      )
    }

    // Check if this pick is locked or if kickoff has passed
    // Find the first match in this group to check kickoff time
    const { data: groupMatches, error: matchError } = await supabase
      .from('matches')
      .select('kickoff_utc, status')
      .eq('group_letter', group_letter)
      .eq('stage', 'GROUP')
      .order('kickoff_utc', { ascending: true })
      .limit(1)

    if (matchError) {
      console.error('[picks/group/POST] match lookup error:', matchError)
      return NextResponse.json({ error: 'Failed to check match status' }, { status: 500 })
    }

    if (groupMatches && groupMatches.length > 0) {
      const firstMatch = groupMatches[0]
      const kickoff = new Date(firstMatch.kickoff_utc)
      const now = new Date()
      if (now >= kickoff) {
        return NextResponse.json(
          { error: 'Group picks are locked — the first match in this group has already kicked off' },
          { status: 409 }
        )
      }
    }

    // Check existing group picks for this player
    const { data: existingPicks, error: picksError } = await supabase
      .from('group_picks')
      .select('id, group_letter, team_id, position, is_joker, locked')
      .eq('player_id', player_id)

    if (picksError) {
      console.error('[picks/group/POST] existing picks error:', picksError)
      return NextResponse.json({ error: 'Failed to fetch existing picks' }, { status: 500 })
    }

    const picks = existingPicks ?? []

    // Check if the existing pick for this group+position is locked
    const existingForSlot = picks.find(
      (p) => p.group_letter === group_letter && p.position === position
    )
    if (existingForSlot?.locked) {
      return NextResponse.json({ error: 'This pick is locked and cannot be changed' }, { status: 409 })
    }

    // Validate: max 10 groups
    const uniqueGroups = new Set(picks.map((p) => p.group_letter))
    // If this is a new group (not already in the set) and we're at the limit, reject
    if (!uniqueGroups.has(group_letter) && uniqueGroups.size >= MAX_GROUPS) {
      return NextResponse.json(
        { error: `You can pick a maximum of ${MAX_GROUPS} groups` },
        { status: 400 }
      )
    }

    // Validate: max 6 favourites
    // A "favourite" is the team in a match with the lowest decimal odds (closest to 1.0)
    // We approximate: fetch all outright odds and find the team with lowest odds in this group
    const { data: groupTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('group_letter', group_letter)

    const groupTeamIds = (groupTeams ?? []).map((t) => t.id)

    const { data: outrightOddsRows } = await supabase
      .from('outright_odds')
      .select('team_id, decimal_odds')
      .in('team_id', groupTeamIds.length > 0 ? groupTeamIds : [-1])
      .eq('market', 'tournament_winner')

    // Find the team_id with the minimum odds in this group (the favourite)
    let favouriteTeamId: number | null = null
    if (outrightOddsRows && outrightOddsRows.length > 0) {
      const minOddsRow = outrightOddsRows.reduce((prev, curr) =>
        curr.decimal_odds < prev.decimal_odds ? curr : prev
      )
      favouriteTeamId = minOddsRow.team_id
    }

    if (favouriteTeamId !== null && team_id === favouriteTeamId) {
      // Count how many times this player has already picked the favourite team across all groups
      // (excluding the current slot being upserted)
      const favouritePickCount = picks.filter(
        (p) =>
          p.team_id === favouriteTeamId &&
          !(p.group_letter === group_letter && p.position === position)
      ).length

      if (favouritePickCount >= MAX_FAVOURITES) {
        return NextResponse.json(
          { error: `You can only pick the tournament favourite in up to ${MAX_FAVOURITES} groups` },
          { status: 400 }
        )
      }
    }

    // Validate: only 1 joker across ALL group picks
    if (is_joker) {
      const otherJoker = picks.find(
        (p) =>
          p.is_joker &&
          !(p.group_letter === group_letter && p.position === position)
      )
      if (otherJoker) {
        return NextResponse.json(
          { error: 'You can only use 1 joker across all group picks' },
          { status: 400 }
        )
      }
    }

    // Upsert the pick (unique on player_id + group_letter + position)
    const { data: upserted, error: upsertError } = await supabase
      .from('group_picks')
      .upsert(
        {
          player_id,
          group_letter,
          team_id,
          position,
          is_joker,
          locked: false,
        },
        { onConflict: 'player_id,group_letter,position' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[picks/group/POST] upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 })
    }

    return NextResponse.json({ pick: upserted }, { status: 200 })
  } catch (err) {
    console.error('[picks/group/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
