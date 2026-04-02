'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/types/database'

interface UseRealtimeMatchesResult {
  matches: Match[]
  loading: boolean
  error: string | null
}

export function useRealtimeMatches(
  onMatchInPlay?: () => void
): UseRealtimeMatchesResult {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseRef = useRef(createClient())
  // Keep the callback ref stable so the channel listener always has the latest version
  const onMatchInPlayRef = useRef(onMatchInPlay)
  onMatchInPlayRef.current = onMatchInPlay

  const fetchMatches = useCallback(async () => {
    const supabase = supabaseRef.current
    const { data, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_utc', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setMatches(data ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = supabaseRef.current

    const init = async () => {
      setLoading(true)
      setError(null)
      await fetchMatches()
      if (!cancelled) setLoading(false)
    }

    init()

    const channel = supabase
      .channel('matches:all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          if (cancelled) return

          const updated = payload.new as Match | undefined
          const old = payload.old as Match | undefined

          setMatches((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as Match]
            }

            if (payload.eventType === 'UPDATE') {
              // Trigger picks refetch when a match transitions into IN_PLAY
              if (
                updated?.status === 'IN_PLAY' &&
                old?.status !== 'IN_PLAY' &&
                onMatchInPlayRef.current
              ) {
                onMatchInPlayRef.current()
              }

              return prev.map((m) =>
                m.id === (payload.new as Match).id
                  ? (payload.new as Match)
                  : m
              )
            }

            if (payload.eventType === 'DELETE') {
              return prev.filter((m) => m.id !== (payload.old as Match).id)
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
  }, [fetchMatches])

  return { matches, loading, error }
}
