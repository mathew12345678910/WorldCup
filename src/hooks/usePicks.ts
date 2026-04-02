'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  GroupPick,
  KnockoutPick,
  SpecialPick,
  NoveltyPick,
} from '@/types/database'

interface UsePicksResult {
  groupPicks: GroupPick[]
  knockoutPicks: KnockoutPick[]
  specialPicks: SpecialPick[]
  noveltyPicks: NoveltyPick[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePicks(player_id: string): UsePicksResult {
  const [groupPicks, setGroupPicks] = useState<GroupPick[]>([])
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPick[]>([])
  const [specialPicks, setSpecialPicks] = useState<SpecialPick[]>([])
  const [noveltyPicks, setNoveltyPicks] = useState<NoveltyPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Increment this to force a refetch
  const [fetchCounter, setFetchCounter] = useState(0)

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!player_id) {
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = createClient()

    const fetchAll = async () => {
      setLoading(true)
      setError(null)

      const [
        { data: gp, error: gpErr },
        { data: kp, error: kpErr },
        { data: sp, error: spErr },
        { data: np, error: npErr },
      ] = await Promise.all([
        supabase
          .from('group_picks')
          .select('*')
          .eq('player_id', player_id)
          .order('group_letter', { ascending: true })
          .order('position', { ascending: true }),
        supabase
          .from('knockout_picks')
          .select('*')
          .eq('player_id', player_id),
        supabase
          .from('special_picks')
          .select('*')
          .eq('player_id', player_id),
        supabase
          .from('novelty_picks')
          .select('*')
          .eq('player_id', player_id),
      ])

      if (cancelled) return

      const firstError = gpErr ?? kpErr ?? spErr ?? npErr
      if (firstError) {
        setError(firstError.message)
      } else {
        setGroupPicks(gp ?? [])
        setKnockoutPicks(kp ?? [])
        setSpecialPicks(sp ?? [])
        setNoveltyPicks(np ?? [])
      }
      setLoading(false)
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [player_id, fetchCounter])

  return {
    groupPicks,
    knockoutPicks,
    specialPicks,
    noveltyPicks,
    loading,
    error,
    refetch,
  }
}
