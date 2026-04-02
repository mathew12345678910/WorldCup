'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeScores } from '@/hooks/useRealtimeScores'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ScoreChart } from '@/components/leaderboard/ScoreChart'
import { staggerContainer, listItem } from '@/lib/animations'
import type { Player, PlayerScore } from '@/types/database'

interface PlayerWithScore extends Player {
  score: PlayerScore | null
}

function StepTick({ complete }: { complete: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs ${
        complete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-600'
      }`}
    >
      {complete ? '✓' : '·'}
    </span>
  )
}

function CompletionTicks({ score }: { score: PlayerScore | null }) {
  if (!score) {
    return (
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => <StepTick key={i} complete={false} />)}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1" title="Groups / Knockout / Specials / Novelty">
      <StepTick complete={score.group_points > 0} />
      <StepTick complete={score.knockout_points > 0} />
      <StepTick complete={score.special_points > 0} />
      <StepTick complete={score.novelty_points > 0} />
    </div>
  )
}

export default function LeaderboardPage() {
  const params = useParams<{ pin: string }>()
  const gamePin = params.pin
  const router = useRouter()

  const [gameId, setGameId] = useState<string | null>(null)
  const [gameName, setGameName] = useState<string>('')
  const [entryFee, setEntryFee] = useState<number>(0)
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [gameError, setGameError] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const { scores, loading: scoresLoading } = useRealtimeScores(gameId ?? '')

  // Fetch game + players on mount
  useEffect(() => {
    if (!gamePin) return

    const supabase = createClient()

    const init = async () => {
      setLoadingPlayers(true)

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('id, name, entry_fee')
        .eq('pin', gamePin)
        .single()

      if (gameErr || !game) {
        setGameError('Game not found')
        setLoadingPlayers(false)
        return
      }

      setGameId(game.id)
      setGameName(game.name)
      setEntryFee(game.entry_fee)

      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('joined_at', { ascending: true })

      setPlayers(playerData ?? [])
      setLoadingPlayers(false)
    }

    init()
  }, [gamePin])

  const unpaidPlayers = players.filter((p) => !p.has_paid)
  const potSize = players.filter((p) => p.has_paid).length * entryFee

  // Merge players and scores, sort by rank then by name
  const playersWithScores: PlayerWithScore[] = players
    .map((p) => ({
      ...p,
      score: scores.find((s) => s.player_id === p.id) ?? null,
    }))
    .sort((a, b) => {
      const ra = a.score?.rank ?? 999
      const rb = b.score?.rank ?? 999
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    })

  const selectedPlayer = playersWithScores.find((p) => p.id === selectedPlayerId)

  const isLoading = loadingPlayers || scoresLoading

  if (gameError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl">⚠️</p>
          <h1 className="text-xl font-bold text-white">Game not found</h1>
          <Button variant="secondary" onClick={() => router.push('/')}>Go home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{gameName || 'Leaderboard'}</h1>
            <p className="text-xs text-gray-500">Pin: {gamePin}</p>
          </div>
          <div className="flex items-center gap-3">
            {potSize > 0 && (
              <div className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                Pot: £{potSize}
              </div>
            )}
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Unpaid banner */}
        <AnimatePresence>
          {unpaidPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3"
            >
              <p className="text-amber-400 text-sm font-medium">
                Unpaid players:{' '}
                <span className="font-normal text-amber-300">
                  {unpaidPlayers.map((p) => p.name).join(', ')}
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected player chart */}
        <AnimatePresence>
          {selectedPlayer?.score && (
            <motion.div
              key={selectedPlayer.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={selectedPlayer.name} color={selectedPlayer.avatar_color} size="md" />
                <div>
                  <p className="text-sm font-semibold text-white">{selectedPlayer.name}</p>
                  <p className="text-xs text-gray-500">Score breakdown</p>
                </div>
                <button
                  onClick={() => setSelectedPlayerId(null)}
                  className="ml-auto text-gray-500 hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <ScoreChart score={selectedPlayer.score} playerName={selectedPlayer.name} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 grid grid-cols-[2rem_1fr_auto_auto] gap-2 items-center">
            <span className="text-xs text-gray-500 text-center">#</span>
            <span className="text-xs text-gray-500">Player</span>
            <span className="text-xs text-gray-500 text-right hidden sm:block">Breakdown</span>
            <span className="text-xs text-gray-500 text-right">Total</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : playersWithScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
              No players yet.
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {playersWithScores.map((pw, index) => {
                const rank = pw.score?.rank ?? index + 1
                const isSelected = selectedPlayerId === pw.id
                return (
                  <motion.button
                    key={pw.id}
                    variants={listItem}
                    onClick={() => setSelectedPlayerId(isSelected ? null : pw.id)}
                    className={[
                      'w-full grid grid-cols-[2rem_1fr_auto_auto] gap-2 items-center px-4 py-3',
                      'border-b border-gray-800/60 last:border-0 transition-colors text-left',
                      isSelected
                        ? 'bg-amber-500/5'
                        : 'hover:bg-gray-800/50',
                    ].join(' ')}
                  >
                    {/* Rank */}
                    <span className={`text-sm font-bold text-center ${rank <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </span>

                    {/* Player */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={pw.name} color={pw.avatar_color} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{pw.name}</span>
                          {!pw.has_paid && (
                            <span className="text-xs text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              unpaid
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <CompletionTicks score={pw.score} />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown (hidden on mobile) */}
                    <div className="hidden sm:flex items-center gap-1 text-right">
                      {pw.score ? (
                        <div className="text-xs text-gray-500 space-y-0.5 text-right">
                          <div>
                            <span className="text-indigo-400">{pw.score.group_points}</span>
                            <span className="text-gray-600"> / </span>
                            <span className="text-amber-400">{pw.score.knockout_points}</span>
                            <span className="text-gray-600"> / </span>
                            <span className="text-emerald-400">{pw.score.special_points}</span>
                            <span className="text-gray-600"> / </span>
                            <span className="text-pink-400">{pw.score.novelty_points}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </div>

                    {/* Total */}
                    <span className="text-sm font-bold text-white text-right tabular-nums">
                      {pw.score?.total_points ?? 0}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
          {[
            { label: 'Groups', color: 'text-indigo-400' },
            { label: 'Knockout', color: 'text-amber-400' },
            { label: 'Specials', color: 'text-emerald-400' },
            { label: 'Novelty', color: 'text-pink-400' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${color} bg-current`} />
              {label}
            </div>
          ))}
          <p className="text-xs text-gray-600 ml-auto">Tap a row for chart</p>
        </div>
      </main>
    </div>
  )
}
