'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OutrightOdds } from '@/types/database'

interface MatchOdds {
  match_id: number
  home_odds: number | null
  away_odds: number | null
  draw_odds: number | null
}

/**
 * Fetches outright odds (tournament winner, etc.) and match-level odds
 * from Supabase. Updated once daily by cron.
 */
export function useOdds() {
  const [outrightOdds, setOutrightOdds] = useState<OutrightOdds[]>([])
  const [matchOdds, setMatchOdds] = useState<MatchOdds[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchOdds() {
      setLoading(true)

      const [outrightRes, matchRes] = await Promise.all([
        supabase
          .from('outright_odds')
          .select('*')
          .order('decimal_odds', { ascending: true }),
        supabase
          .from('match_results')
          .select('match_id, home_odds, away_odds, draw_odds'),
      ])

      setOutrightOdds(outrightRes.data ?? [])
      setMatchOdds(
        (matchRes.data ?? []).map((r) => ({
          match_id: r.match_id as number,
          home_odds: r.home_odds as number | null,
          away_odds: r.away_odds as number | null,
          draw_odds: r.draw_odds as number | null,
        }))
      )
      setLoading(false)
    }

    fetchOdds()
  }, [])

  /** Get outright odds for a team (winner market by default) */
  function getTeamOutrightOdds(teamId: number, market = 'winner'): number | null {
    const entry = outrightOdds.find(
      (o) => o.team_id === teamId && o.market === market
    )
    return entry?.decimal_odds ?? null
  }

  /** Get match odds by match ID */
  function getMatchOdds(matchId: number): MatchOdds | null {
    return matchOdds.find((m) => m.match_id === matchId) ?? null
  }

  /** Odds map: teamId → decimal_odds for a given market */
  function getOddsMap(market = 'winner'): Map<number, number> {
    const map = new Map<number, number>()
    for (const o of outrightOdds) {
      if (o.market === market) {
        map.set(o.team_id, o.decimal_odds)
      }
    }
    return map
  }

  return {
    outrightOdds,
    matchOdds,
    loading,
    getTeamOutrightOdds,
    getMatchOdds,
    getOddsMap,
  }
}
