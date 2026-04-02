'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlayerScore } from '@/types/database'

interface UseRealtimeScoresResult {
  scores: PlayerScore[]
  loading: boolean
  error: string | null
}

export function useRealtimeScores(game_id: string): UseRealtimeScoresResult {
  const [scores, setScores] = useState<PlayerScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a stable ref to the supabase client so we don't recreate it
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!game_id) return

    const supabase = supabaseRef.current
    let cancelled = false

    const fetchInitial = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('player_scores')
        .select('*')
        .eq('game_id', game_id)
        .order('rank', { ascending: true, nullsFirst: false })

      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setScores(data ?? [])
      }
      setLoading(false)
    }

    fetchInitial()

    const channel = supabase
      .channel(`player_scores:game_id=${game_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_scores',
          filter: `game_id=eq.${game_id}`,
        },
        (payload) => {
          if (cancelled) return

          setScores((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as PlayerScore]
            }

            if (payload.eventType === 'UPDATE') {
              return prev.map((s) =>
                s.id === (payload.new as PlayerScore).id
                  ? (payload.new as PlayerScore)
                  : s
              )
            }

            if (payload.eventType === 'DELETE') {
              return prev.filter(
                (s) => s.id !== (payload.old as PlayerScore).id
              )
            }

            return prev
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [game_id])

  return { scores, loading, error }
}
