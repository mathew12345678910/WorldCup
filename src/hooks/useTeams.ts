'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/types/database'

interface UseTeamsResult {
  teams: Team[]
  teamsByGroup: Record<string, Team[]>
  loading: boolean
  error: string | null
}

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsByGroup, setTeamsByGroup] = useState<Record<string, Team[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const fetchTeams = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('teams')
        .select('*')
        .order('group_letter', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const allTeams = data ?? []
      setTeams(allTeams)

      // Group teams by group_letter, ignoring teams without one
      const grouped = allTeams.reduce<Record<string, Team[]>>((acc, team) => {
        if (team.group_letter) {
          if (!acc[team.group_letter]) {
            acc[team.group_letter] = []
          }
          acc[team.group_letter].push(team)
        }
        return acc
      }, {})

      setTeamsByGroup(grouped)
      setLoading(false)
    }

    fetchTeams()

    return () => {
      cancelled = true
    }
  }, [])

  return { teams, teamsByGroup, loading, error }
}
