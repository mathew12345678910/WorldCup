'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { staggerContainer, fadeIn } from '@/lib/animations'
import type { Player, Game } from '@/types/database'

export default function AdminPage() {
  const params = useParams<{ pin: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gamePin = params.pin
  const adminToken = searchParams.get('admin_token') ?? ''

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [pageError, setPageError] = useState('')
  const [togglingPaid, setTogglingPaid] = useState<Set<string>>(new Set())
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!gamePin || !adminToken) {
      setAuthError(true)
      setLoading(false)
      return
    }

    const supabase = createClient()

    const init = async () => {
      setLoading(true)

      const { data: gameData, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('pin', gamePin)
        .single()

      if (gameErr || !gameData) {
        setPageError('Game not found')
        setLoading(false)
        return
      }

      if (gameData.admin_token !== adminToken) {
        setAuthError(true)
        setLoading(false)
        return
      }

      setGame(gameData)

      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameData.id)
        .order('joined_at', { ascending: true })

      setPlayers(playerData ?? [])
      setLoading(false)
    }

    init()
  }, [gamePin, adminToken])

  async function togglePayment(player: Player) {
    setTogglingPaid((prev) => {
      const next = new Set(prev)
      next.add(player.id)
      return next
    })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('players')
      .update({ has_paid: !player.has_paid })
      .eq('id', player.id)
      .select()
      .single()

    if (!error && data) {
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? data : p)))
    }
    setTogglingPaid((prev) => {
      const next = new Set(prev)
      next.delete(player.id)
      return next
    })
  }

  async function triggerRecalculation() {
    if (!game) return
    setRecalculating(true)
    setRecalcMsg('')
    try {
      const res = await fetch(`/api/scores?game_id=${game.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (res.ok) {
        setRecalcMsg('Scores recalculated successfully.')
      } else {
        setRecalcMsg(json.error ?? 'Recalculation failed')
      }
    } catch {
      setRecalcMsg('Network error')
    } finally {
      setRecalculating(false)
      setTimeout(() => setRecalcMsg(''), 4000)
    }
  }

  async function copyShareLink() {
    const url = `${window.location.origin}/join/${gamePin}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const paidCount = players.filter((p) => p.has_paid).length
  const potSize = paidCount * (game?.entry_fee ?? 0)
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${gamePin}` : `/join/${gamePin}`

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-3xl">🔐</p>
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400 text-sm max-w-xs">
            Invalid or missing admin token. Use the admin link you received when creating the game.
          </p>
          <Button variant="secondary" onClick={() => router.push('/')}>Go home</Button>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-gray-400">{pageError}</p>
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
            <h1 className="text-base font-bold text-white">{game?.name}</h1>
            <p className="text-xs text-amber-400 font-medium">Admin Panel</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/game/${gamePin}/leaderboard`)}
            className="text-xs px-3 py-1.5"
          >
            Leaderboard →
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Game overview */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={
                <span className="font-medium text-white">Game Overview</span>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatTile label="PIN" value={gamePin} highlight />
                <StatTile label="Players" value={String(players.length)} />
                <StatTile label="Paid" value={`${paidCount} / ${players.length}`} />
                {(game?.entry_fee ?? 0) > 0 && (
                  <StatTile label="Pot" value={`£${potSize}`} highlight />
                )}
              </div>
            </Card>
          </motion.div>

          {/* Share link */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={<span className="font-medium text-white">Share Game</span>}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-xl px-3 py-2 text-sm font-mono text-gray-300 truncate">
                  {joinUrl}
                </div>
                <Button
                  variant="secondary"
                  onClick={copyShareLink}
                  className="flex-shrink-0 text-sm"
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Player list with payment toggles */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-white">Players</span>
                  <span className="text-xs text-gray-500">{players.length} joined</span>
                </div>
              }
              padding={false}
            >
              {players.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No players yet. Share the game PIN to get started.
                </div>
              ) : (
                <div>
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/60 last:border-0"
                    >
                      <span className="text-xs text-gray-600 w-5 text-center">{index + 1}</span>
                      <Avatar name={player.name} color={player.avatar_color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{player.name}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(player.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePayment(player)}
                        disabled={togglingPaid.has(player.id)}
                        className={[
                          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                          player.has_paid
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600',
                          togglingPaid.has(player.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        {togglingPaid.has(player.id) ? (
                          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>{player.has_paid ? '✓' : '○'}</span>
                        )}
                        {player.has_paid ? 'Paid' : 'Unpaid'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Lock / Unlock + Recalculate */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={<span className="font-medium text-white">Actions</span>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Group Picks</p>
                    <p className="text-xs text-gray-400">Picks lock automatically at first kickoff</p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="secondary" className="text-xs flex-1" onClick={() => {}}>
                        Lock now
                      </Button>
                      <Button variant="ghost" className="text-xs flex-1" onClick={() => {}}>
                        Unlock
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Special Picks</p>
                    <p className="text-xs text-gray-400">Lock before tournament starts</p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="secondary" className="text-xs flex-1" onClick={() => {}}>
                        Lock now
                      </Button>
                      <Button variant="ghost" className="text-xs flex-1" onClick={() => {}}>
                        Unlock
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700/50 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Recalculate Scores</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Re-run scoring for all players based on current results
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      loading={recalculating}
                      onClick={triggerRecalculation}
                      className="flex-shrink-0 text-sm"
                    >
                      Recalculate
                    </Button>
                  </div>
                  {recalcMsg && (
                    <p className={`text-xs mt-2 ${recalcMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {recalcMsg}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}

function StatTile({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold tracking-wide ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
