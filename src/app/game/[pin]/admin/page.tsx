'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { staggerContainer, fadeIn } from '@/lib/animations'
import type { Player, Game } from '@/types/database'

// ── Types for selections data ─────────────────────────────────────────────────

interface PlayerWithPicks extends Player {
  group_picks: {
    group_letter: string
    team_id: number
    position: number
    is_joker: boolean
    locked: boolean
  }[]
  special_picks: {
    pick_type: string
    team_id: number | null
    player_name: string | null
    is_joker: boolean
    locked: boolean
  }[]
  novelty_picks: {
    pick_type: string
    value: string
    locked: boolean
  }[]
  knockout_picks: {
    match_id: number
    team_id: number
    is_joker: boolean
    locked: boolean
  }[]
}

// ── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({
  onAuthenticated,
}: {
  onAuthenticated: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setChecking(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
      if (res.ok) {
        onAuthenticated(password.trim())
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-3xl">🔐</p>
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-gray-400 text-sm">Enter the admin password to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            loading={checking}
            className="w-full"
          >
            {checking ? 'Checking…' : 'Enter'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Selections panel ──────────────────────────────────────────────────────────

const GROUP_LETTERS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function PlayerSelectionsPanel({ player }: { player: PlayerWithPicks }) {
  const [open, setOpen] = useState(false)

  const groupGroups = new Set(player.group_picks.map((p) => p.group_letter)).size
  const specialCount = player.special_picks.length
  const noveltyCount = player.novelty_picks.length
  const knockoutCount = player.knockout_picks.length

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-900 hover:bg-gray-800/80 transition-colors"
      >
        <Avatar name={player.name} color={player.avatar_color} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{player.name}</p>
          <p className="text-xs text-gray-500">
            {groupGroups} groups · {specialCount} specials · {noveltyCount} novelty · {knockoutCount} KO
          </p>
        </div>
        <span className="text-gray-500 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-4 bg-gray-950 border-t border-gray-800">

              {/* Group picks */}
              {player.group_picks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Group Picks ({groupGroups} groups)
                  </p>
                  <div className="space-y-1">
                    {GROUP_LETTERS_ORDER.map((letter) => {
                      const picks = player.group_picks.filter((p) => p.group_letter === letter)
                      if (picks.length === 0) return null
                      const first = picks.find((p) => p.position === 1)
                      const second = picks.find((p) => p.position === 2)
                      return (
                        <div key={letter} className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="text-gray-500 w-12 flex-shrink-0">Group {letter}</span>
                          {first && (
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                              1st: #{first.team_id}{first.is_joker ? ' 🃏' : ''}
                            </span>
                          )}
                          {second && (
                            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                              2nd: #{second.team_id}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Special picks */}
              {player.special_picks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Special Picks ({specialCount}/6)
                  </p>
                  <div className="space-y-1">
                    {player.special_picks.map((sp) => (
                      <div key={sp.pick_type} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-gray-500 capitalize w-36 flex-shrink-0">
                          {sp.pick_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-white">
                          {sp.player_name || (sp.team_id != null ? `Team #${sp.team_id}` : '—')}
                          {sp.is_joker ? ' 🃏' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Novelty picks */}
              {player.novelty_picks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Novelty Picks ({noveltyCount}/7)
                  </p>
                  <div className="space-y-1">
                    {player.novelty_picks.map((np) => (
                      <div key={np.pick_type} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-gray-500 capitalize w-36 flex-shrink-0">
                          {np.pick_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-white">{np.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knockout picks */}
              {player.knockout_picks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Knockout Picks ({knockoutCount})
                  </p>
                  <div className="space-y-1">
                    {player.knockout_picks.map((kp) => (
                      <div key={kp.match_id} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-gray-500 w-24 flex-shrink-0">Match #{kp.match_id}</span>
                        <span className="text-white">
                          Team #{kp.team_id}{kp.is_joker ? ' 🃏' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {player.group_picks.length === 0 &&
                player.special_picks.length === 0 &&
                player.novelty_picks.length === 0 &&
                player.knockout_picks.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No picks submitted yet.</p>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const params = useParams<{ pin: string }>()
  const router = useRouter()
  const gamePin = params.pin

  const [authenticated, setAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [togglingPaid, setTogglingPaid] = useState<Set<string>>(new Set())
  const [deletingPlayer, setDeletingPlayer] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [seedingOdds, setSeedingOdds] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  // Selections state
  const [selections, setSelections] = useState<PlayerWithPicks[] | null>(null)
  const [loadingSelections, setLoadingSelections] = useState(false)
  const [selectionsError, setSelectionsError] = useState('')

  useEffect(() => {
    if (!authenticated || !gamePin) return

    const supabase = createClient()

    const init = async () => {
      setLoading(true)
      setPageError('')

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
  }, [authenticated, gamePin])

  async function loadSelections(gameId: string, password: string) {
    setLoadingSelections(true)
    setSelectionsError('')
    try {
      const res = await fetch(`/api/admin/selections?game_id=${gameId}`, {
        headers: { 'x-admin-password': password },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSelectionsError((json as { error?: string }).error ?? 'Failed to load selections')
        return
      }
      const json = await res.json()
      setSelections((json as { players: PlayerWithPicks[] }).players ?? [])
    } catch {
      setSelectionsError('Network error')
    } finally {
      setLoadingSelections(false)
    }
  }

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

  async function deletePlayer(playerId: string) {
    setDeletingPlayer(playerId)
    setConfirmDelete(null)
    try {
      const res = await fetch(
        `/api/players?player_id=${encodeURIComponent(playerId)}&admin_password=${encodeURIComponent(adminPassword)}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId))
        if (selections) {
          setSelections((prev) => prev ? prev.filter((p) => p.id !== playerId) : prev)
        }
      } else {
        const json = await res.json().catch(() => ({}))
        setPageError((json as { error?: string }).error ?? 'Failed to remove player')
      }
    } catch {
      setPageError('Network error')
    } finally {
      setDeletingPlayer(null)
    }
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
        setRecalcMsg((json as { error?: string }).error ?? 'Recalculation failed')
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

  async function seedOdds() {
    setSeedingOdds(true)
    setSeedMsg('')
    try {
      const res = await fetch('/api/admin/seed-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const json = await res.json() as { seeded?: { total: number }; error?: string }
      if (res.ok) {
        setSeedMsg(`Seeded odds for ${json.seeded?.total ?? '?'} teams.`)
      } else {
        setSeedMsg(json.error ?? 'Failed to seed odds')
      }
    } catch {
      setSeedMsg('Network error')
    } finally {
      setSeedingOdds(false)
      setTimeout(() => setSeedMsg(''), 4000)
    }
  }

  // ── Password gate ─────────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <PasswordGate
        onAuthenticated={(pw) => {
          setAdminPassword(pw)
          setAuthenticated(true)
        }}
      />
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

  const paidCount = players.filter((p) => p.has_paid).length
  const potSize = paidCount * (game?.entry_fee ?? 0)
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${gamePin}` : `/join/${gamePin}`

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{game?.name}</h1>
            <p className="text-xs text-blue-400 font-medium">Admin Panel</p>
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
                      {confirmDelete === player.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-400 whitespace-nowrap">
                            Remove {player.name}?
                          </span>
                          <button
                            onClick={() => deletePlayer(player.id)}
                            disabled={deletingPlayer === player.id}
                            className="text-xs px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingPlayer === player.id ? (
                              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Yes'
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(player.id)}
                          disabled={deletingPlayer === player.id}
                          title="Remove player"
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-700 bg-gray-800 text-gray-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* View All Selections */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-white">View All Selections</span>
                  {game && (
                    <Button
                      variant="secondary"
                      loading={loadingSelections}
                      onClick={() => loadSelections(game.id, adminPassword)}
                      className="text-xs"
                    >
                      {loadingSelections ? 'Loading…' : selections === null ? 'Load Picks' : 'Refresh'}
                    </Button>
                  )}
                </div>
              }
            >
              {selectionsError && (
                <p className="text-red-400 text-sm mb-3">{selectionsError}</p>
              )}
              {selections === null && !loadingSelections && (
                <p className="text-gray-500 text-sm">
                  Click &quot;Load Picks&quot; to view every player&apos;s selections.
                </p>
              )}
              {loadingSelections && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {selections !== null && !loadingSelections && (
                <div className="space-y-2">
                  {selections.length === 0 ? (
                    <p className="text-gray-500 text-sm">No players have submitted picks yet.</p>
                  ) : (
                    selections.map((player) => (
                      <PlayerSelectionsPanel
                        key={player.id}
                        player={player}
                      />
                    ))
                  )}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div variants={fadeIn}>
            <Card
              glass
              header={<span className="font-medium text-white">Actions</span>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Group Picks</p>
                    <p className="text-xs text-gray-400">Picks lock 30 min before first kickoff</p>
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
                      <p className="text-sm font-medium text-white">Seed Odds Data</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Populate realistic outright winner odds for all teams (drives points display)
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      loading={seedingOdds}
                      onClick={seedOdds}
                      className="flex-shrink-0 text-sm"
                    >
                      Seed Odds
                    </Button>
                  </div>
                  {seedMsg && (
                    <p className={`text-xs mt-2 ${seedMsg.includes('Seeded') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {seedMsg}
                    </p>
                  )}
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
      <p className={`text-lg font-bold tracking-wide ${highlight ? 'text-blue-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
