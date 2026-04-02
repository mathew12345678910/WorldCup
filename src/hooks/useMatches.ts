'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, MatchStage } from '@/types/database'

interface UseMatchesOptions {
  stage?: MatchStage
}

interface UseMatchesResult {
  matches: Match[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMatches(options?: UseMatchesOptions): UseMatchesResult {
  const { stage } = options ?? {}

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Increment to force a refetch
  const [fetchCounter, setFetchCounter] = useState(0)

  const refetch = useCallback(() => {
    setFetchCounter((c) => c + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const fetchMatches = async () => {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('matches')
        .select('*')
        .order('kickoff_utc', { ascending: true })

      if (stage) {
        query = query.eq('stage', stage)
      }

      const { data, error: fetchError } = await query

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setMatches(data ?? [])
      }
      setLoading(false)
    }

    fetchMatches()

    return () => {
      cancelled = true
    }
  }, [stage, fetchCounter])

  return { matches, loading, error, refetch }
}
