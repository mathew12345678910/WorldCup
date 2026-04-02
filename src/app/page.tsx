'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fadeIn, staggerContainer } from '@/lib/animations'

type Mode = 'idle' | 'create' | 'join'

interface CreatedGame {
  pin: string
  adminToken: string
  name: string
}

export default function LandingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('idle')
  const [joinPin, setJoinPin] = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState<CreatedGame | null>(null)
  const [copied, setCopied] = useState<'pin' | 'admin' | null>(null)

  async function handleCreateGame() {
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json.error ?? 'Failed to create game')
        return
      }
      setCreated({
        pin: json.game.pin,
        adminToken: json.admin_token,
        name: json.game.name,
      })
      setMode('create')
    } catch {
      setCreateError('Network error — please try again')
    } finally {
      setCreating(false)
    }
  }

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = joinPin.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setJoinError('PIN must be exactly 6 characters')
      return
    }
    router.push(`/join/${trimmed}`)
  }

  async function copyToClipboard(text: string, type: 'pin' | 'admin') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // silently ignore
    }
  }

  const adminUrl = created
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/game/${created.pin}/admin?admin_token=${created.adminToken}`
    : ''

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md flex flex-col items-center gap-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Hero */}
        <motion.div variants={fadeIn} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-4">
            <span>⚽</span>
            <span>FIFA World Cup 2026</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
            WC26 <span className="text-amber-400">Predictor</span>
          </h1>
          <p className="text-gray-400 text-base max-w-sm mx-auto">
            Create a private game, invite your friends, and compete with your World Cup predictions.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Idle: two action buttons ── */}
          {mode === 'idle' && !created && (
            <motion.div
              key="idle"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              className="w-full space-y-3"
            >
              <Button
                variant="primary"
                fullWidth
                loading={creating}
                onClick={handleCreateGame}
                className="py-3 text-base font-semibold"
              >
                Create Game
              </Button>
              {createError && (
                <p className="text-red-400 text-sm text-center">{createError}</p>
              )}
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setMode('join')}
                className="py-3 text-base"
              >
                Join Game
              </Button>
            </motion.div>
          )}

          {/* ── Join: pin input ── */}
          {mode === 'join' && (
            <motion.div
              key="join"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              className="w-full"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white">Enter game PIN</h2>
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <Input
                    label="6-character PIN"
                    placeholder=""
                    value={joinPin}
                    onChange={(e) => {
                      setJoinPin(e.target.value.toUpperCase().slice(0, 6))
                      setJoinError('')
                    }}
                    maxLength={6}
                    autoFocus
                    error={joinError}
                    className="text-center text-xl tracking-widest font-mono uppercase"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={joinPin.trim().length !== 6}
                    className="py-3 text-base font-semibold"
                  >
                    Join Game
                  </Button>
                </form>
                <button
                  onClick={() => { setMode('idle'); setJoinPin(''); setJoinError('') }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Created: show PIN + admin link ── */}
          {mode === 'create' && created && (
            <motion.div
              key="created"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="w-full"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-sm font-medium">Game created!</span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Game PIN</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold tracking-widest font-mono text-amber-400">
                      {created.pin}
                    </span>
                    <button
                      onClick={() => copyToClipboard(created.pin, 'pin')}
                      className="text-xs text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-700"
                    >
                      {copied === 'pin' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Share this PIN with your players.</p>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Admin link</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 truncate flex-1 font-mono bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                      {adminUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(adminUrl, 'admin')}
                      className="text-xs text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-700 flex-shrink-0"
                    >
                      {copied === 'admin' ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-amber-500/80 text-xs mt-1.5">
                    Save this link — it grants admin access. Do not share it with players.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/game/${created.pin}/admin?admin_token=${created.adminToken}`)}
                    className="text-sm"
                  >
                    Open Admin
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => router.push(`/join/${created.pin}`)}
                    className="text-sm"
                  >
                    Join as Player
                  </Button>
                </div>

                <button
                  onClick={() => { setMode('idle'); setCreated(null) }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
                >
                  Create another game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
