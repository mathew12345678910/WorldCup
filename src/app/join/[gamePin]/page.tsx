'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fadeIn, staggerContainer } from '@/lib/animations'

type JoinState = 'loading' | 'ready' | 'joining' | 'name-taken' | 'success' | 'error'

interface GameInfo {
  id: string
  name: string
  playerCount: number
}

export default function JoinGamePage() {
  const params = useParams<{ gamePin: string }>()
  const gamePin = (params.gamePin ?? '').toUpperCase()
  const router = useRouter()

  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [joinState, setJoinState] = useState<JoinState>('loading')
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [pageError, setPageError] = useState('')
  const [returningToken, setReturningToken] = useState<string | null>(null)

  // On mount: check localStorage for an existing token for this pin
  useEffect(() => {
    if (!gamePin) return

    const storageKey = `wc26_token_${gamePin}`
    const existingToken = localStorage.getItem(storageKey)
    if (existingToken) {
      // Validate token against DB before redirecting
      validateAndRedirect(existingToken)
      return
    }

    fetchGameInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePin])

  async function validateAndRedirect(token: string) {
    // We optimistically redirect; the game page will handle invalid tokens
    router.replace(`/game/${gamePin}/me/${token}`)
  }

  async function fetchGameInfo() {
    try {
      // We fetch via a POST dry-run: send an empty name to get game info back
      // Actually we peek via the players GET endpoint with game resolution
      // Use a minimal fetch to /api/players?game_pin=X to get count
      // Since we only have game_id-based players GET, we'll do a lightweight approach:
      // POST with a dummy join to check the game exists (we validate name separately)
      // Better: do a HEAD to /api/games for the pin. Since that doesn't exist,
      // we'll just show the form and get game info on actual join.
      setJoinState('ready')
    } catch {
      setJoinState('error')
      setPageError('Failed to load game information')
    }
  }

  async function handleJoin() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Please enter your name')
      return
    }
    if (trimmedName.length > 30) {
      setNameError('Name must be 30 characters or fewer')
      return
    }
    setNameError('')
    setJoinState('joining')

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, gamePin }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 404) {
          setPageError('Game not found. Check your PIN and try again.')
        } else if (res.status === 409) {
          setPageError(json.error ?? 'Could not join game')
        } else {
          setPageError(json.error ?? 'Failed to join game')
        }
        setJoinState('ready')
        return
      }

      setGameInfo({ id: json.game.id, name: json.game.name, playerCount: 0 })

      if (json.returning) {
        // Name already exists — ask if it's them
        setReturningToken(json.player.token)
        setJoinState('name-taken')
        return
      }

      // New player — store token and redirect
      const storageKey = `wc26_token_${gamePin}`
      localStorage.setItem(storageKey, json.player.token)
      router.push(`/game/${gamePin}/me/${json.player.token}`)
    } catch {
      setPageError('Network error — please try again')
      setJoinState('ready')
    }
  }

  function handleClaimAsMe() {
    if (!returningToken) return
    const storageKey = `wc26_token_${gamePin}`
    localStorage.setItem(storageKey, returningToken)
    router.push(`/game/${gamePin}/me/${returningToken}`)
  }

  function handleNotMe() {
    setJoinState('ready')
    setName('')
    setReturningToken(null)
    setPageError('')
  }

  if (joinState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/4 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeIn} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-amber-400 text-xs font-medium mb-3">
            <span>⚽</span>
            <span>Game PIN: {gamePin}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {gameInfo ? gameInfo.name : 'Join Game'}
          </h1>
          {gameInfo && (
            <p className="text-gray-500 text-sm mt-1">
              {gameInfo.playerCount > 0 ? `${gameInfo.playerCount} player${gameInfo.playerCount !== 1 ? 's' : ''} joined` : 'Be the first to join!'}
            </p>
          )}
        </motion.div>

        <motion.div variants={fadeIn}>
          {/* ── Name-taken flow ── */}
          {joinState === 'name-taken' ? (
            <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-xl mt-0.5">⚠️</span>
                <div>
                  <p className="text-white font-medium">That name is taken</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Is that you? You can reclaim your picks, or choose a different name.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleClaimAsMe}
                  className="py-3 font-semibold"
                >
                  Yes, that&apos;s me — sign in
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleNotMe}
                  className="py-3"
                >
                  No, I&apos;ll use a different name
                </Button>
              </div>
            </div>
          ) : (
            /* ── Normal join form ── */
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white">Enter your name</h2>
              <Input
                label="Your name"
                placeholder=""
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, 30))
                  setNameError('')
                  setPageError('')
                }}
                maxLength={30}
                autoFocus
                error={nameError}
                hint={`${name.length}/30 characters`}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
              />
              {pageError && (
                <p className="text-red-400 text-sm">{pageError}</p>
              )}
              <Button
                variant="primary"
                fullWidth
                loading={joinState === 'joining'}
                onClick={handleJoin}
                disabled={!name.trim()}
                className="py-3 text-base font-semibold"
              >
                Join Game
              </Button>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeIn} className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to home
          </a>
        </motion.div>
      </motion.div>
    </div>
  )
}
