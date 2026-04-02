'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Player } from '@/types/database'

interface UsePlayerResult {
  player: Player | null
  loading: boolean
  error: string | null
}

export function usePlayer(gamePin: string, token: string): UsePlayerResult {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gamePin || !token) {
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = createClient()

    const fetchPlayer = async () => {
      setLoading(true)
      setError(null)

      // First resolve the game by its pin
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('pin', gamePin)
        .single()

      if (cancelled) return

      if (gameError || !game) {
        setError(gameError?.message ?? 'Game not found')
        setLoading(false)
        return
      }

      const { data, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .eq('token', token)
        .single()

      if (cancelled) return

      if (playerError) {
        setError(playerError.message)
        setPlayer(null)
      } else {
        setPlayer(data)
      }
      setLoading(false)
    }

    fetchPlayer()

    return () => {
      cancelled = true
    }
  }, [gamePin, token])

  return { player, loading, error }
}
