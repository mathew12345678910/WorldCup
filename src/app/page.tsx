'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Mode = 'idle' | 'create' | 'join'

interface CreatedGame {
  pin: string
  adminToken: string
  name: string
}

/* ─── Floating football background ──────────────────────────────────────────── */
interface FloatingBall {
  id: number
  top: string
  left: string
  size: number
  delay: number
  duration: number
  opacity: number
  driftClass: string
}

const FLOATING_BALLS: FloatingBall[] = [
  { id: 0, top: '12%',  left: '8%',  size: 28, delay: 0,   duration: 22, opacity: 0.10, driftClass: 'animate-drift-right' },
  { id: 1, top: '55%',  left: '92%', size: 20, delay: 3,   duration: 26, opacity: 0.08, driftClass: 'animate-drift-left' },
  { id: 2, top: '78%',  left: '5%',  size: 36, delay: 7,   duration: 19, opacity: 0.07, driftClass: 'animate-drift-right' },
  { id: 3, top: '30%',  left: '88%', size: 22, delay: 11,  duration: 24, opacity: 0.09, driftClass: 'animate-drift-left' },
  { id: 4, top: '88%',  left: '75%', size: 18, delay: 2,   duration: 28, opacity: 0.06, driftClass: 'animate-drift-left' },
  { id: 5, top: '20%',  left: '50%', size: 16, delay: 15,  duration: 20, opacity: 0.06, driftClass: 'animate-drift-right' },
]

function FootballSVG({ size, color = '#f9fafb', patchColor = '#1e293b' }: { size: number; color?: string; patchColor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill={color} stroke="#d1d5db" strokeWidth="0.75" />
      <polygon points="12,7.5 14.7,9.4 13.7,12.5 10.3,12.5 9.3,9.4" fill={patchColor} opacity="0.85" />
      <polygon points="12,2.5 13.8,4.2 13,5.8 11,5.8 10.2,4.2" fill={patchColor} opacity="0.65" />
      <polygon points="18,6 18.8,8.1 17.4,9.4 15.6,8.6 15.4,6.5" fill={patchColor} opacity="0.65" />
      <polygon points="6,6 8.6,6.5 8.4,8.6 6.6,9.4 5.2,8.1" fill={patchColor} opacity="0.65" />
      <polygon points="17.4,14.6 18.5,16.5 17,18 15.2,17.3 14.8,15.2" fill={patchColor} opacity="0.65" />
      <polygon points="6.6,14.6 9.2,15.2 8.8,17.3 7,18 5.5,16.5" fill={patchColor} opacity="0.65" />
      <polygon points="12,21.5 10.2,19.8 11,18.2 13,18.2 13.8,19.8" fill={patchColor} opacity="0.65" />
    </svg>
  )
}

/* ─── Hexagonal mesh overlay ─────────────────────────────────────────────────── */
function HexMesh() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0),
          radial-gradient(circle at 21px 21px, rgba(255,255,255,0.015) 1px, transparent 0)
        `,
        backgroundSize: '42px 42px',
      }}
    />
  )
}

/* ─── Stadium light rays ─────────────────────────────────────────────────────── */
function StadiumLights() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: '140%',
          height: '55%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.09) 0%, rgba(251,191,36,0.04) 35%, transparent 70%)',
        }}
      />
      {/* Bottom pitch gradient */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '35%',
          background: 'linear-gradient(to top, rgba(16,185,129,0.13) 0%, rgba(16,185,129,0.05) 40%, transparent 100%)',
        }}
      />
      {/* Left flare */}
      <div
        className="absolute top-1/4 left-0"
        style={{
          width: '40%',
          height: '50%',
          background: 'radial-gradient(ellipse at 0% 50%, rgba(99,102,241,0.07) 0%, transparent 60%)',
        }}
      />
      {/* Right flare */}
      <div
        className="absolute top-1/3 right-0"
        style={{
          width: '40%',
          height: '50%',
          background: 'radial-gradient(ellipse at 100% 50%, rgba(251,191,36,0.06) 0%, transparent 60%)',
        }}
      />
      {/* Center deep glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

/* ─── Bouncing hero ball ─────────────────────────────────────────────────────── */
function HeroBall() {
  return (
    <motion.div
      className="relative"
      animate={{
        y: [0, -18, 0, -10, 0],
        rotate: [0, 15, 0, -8, 0],
      }}
      transition={{
        duration: 3.2,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 0.8,
      }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 }}
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      <FootballSVG size={72} color="#ffffff" patchColor="#0f172a" />
      {/* Shadow */}
      <motion.div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full"
        animate={{ scaleX: [1, 0.7, 1, 0.8, 1], opacity: [0.3, 0.15, 0.3, 0.2, 0.3] }}
        transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 }}
        style={{ width: 48, height: 8, background: 'rgba(0,0,0,0.5)', filter: 'blur(4px)' }}
      />
    </motion.div>
  )
}

/* ─── Animated title letters ─────────────────────────────────────────────────── */
function AnimatedTitle() {
  const title1 = 'WC26'
  const title2 = 'Predictor'

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.055, delayChildren: 0.2 } },
  }
  const letterVariants = {
    hidden: { opacity: 0, y: 40, rotateX: -90 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
    },
  }

  return (
    <div className="text-center space-y-1" style={{ perspective: '600px' }}>
      <motion.div
        className="flex justify-center gap-1 sm:gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {title1.split('').map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            className="inline-block text-5xl sm:text-7xl font-black tracking-tight text-white"
            style={{ lineHeight: 1 }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        className="flex justify-center gap-0.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {title2.split('').map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            className="inline-block text-4xl sm:text-6xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 40%, #fbbf24 70%, #fcd34d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1,
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    </div>
  )
}

/* ─── Card panel ─────────────────────────────────────────────────────────────── */
const panelVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
  exit: { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' as const } },
}

/* ─── Copy button ─────────────────────────────────────────────────────────────── */
function CopyButton({ label, onCopy, copied }: { text?: string; label: string; onCopy: () => void; copied: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onCopy}
      className={[
        'text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 flex-shrink-0 font-medium',
        copied
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white',
      ].join(' ')}
    >
      {copied ? '✓ Copied' : label}
    </motion.button>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
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
      setCreated({ pin: json.game.pin, adminToken: json.admin_token, name: json.game.name })
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
    <div className="relative min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-16 overflow-hidden">

      {/* ── Layered background ── */}
      <StadiumLights />
      <HexMesh />

      {/* Floating background balls */}
      {FLOATING_BALLS.map((ball) => (
        <div
          key={ball.id}
          className={`absolute pointer-events-none ${ball.driftClass}`}
          style={{
            top: ball.top,
            left: ball.left,
            opacity: ball.opacity,
            animationDelay: `${ball.delay}s`,
            animationDuration: `${ball.duration}s`,
          }}
        >
          <FootballSVG size={ball.size} color="#ffffff" patchColor="#0f172a" />
        </div>
      ))}

      {/* Pitch stripe lines at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 120 }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              bottom: i * 22,
              height: 1,
              background: `rgba(52,211,153,${0.04 + i * 0.015})`,
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-10">

        {/* Hero ball */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <HeroBall />
        </motion.div>

        {/* Badge + Title + Subtitle */}
        <div className="flex flex-col items-center gap-5 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              color: '#fbbf24',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 20, -10, 15, 0] }}
              transition={{ duration: 1.2, delay: 1, repeat: Infinity, repeatDelay: 4 }}
            >
              ⚽
            </motion.span>
            <span>FIFA World Cup 2026</span>
          </motion.div>

          <AnimatedTitle />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-gray-400 text-base max-w-xs mx-auto leading-relaxed"
          >
            Create a private game, invite your friends, and compete with your World Cup predictions.
          </motion.p>

          {/* Pitch divider */}
          <motion.div
            className="pitch-divider w-2/3"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          />
        </div>

        {/* ── Interactive panel ── */}
        <div className="w-full">
          <AnimatePresence mode="wait">

            {/* ── Idle ── */}
            {mode === 'idle' && !created && (
              <motion.div
                key="idle"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="primary"
                    fullWidth
                    loading={creating}
                    onClick={handleCreateGame}
                    className="py-4 text-base font-bold tracking-wide shimmer"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #f59e0b 100%)',
                      backgroundSize: '200% 100%',
                      boxShadow: '0 4px 24px rgba(245,158,11,0.35), 0 0 0 1px rgba(245,158,11,0.15)',
                    } as React.CSSProperties}
                  >
                    {!creating && (
                      <span className="mr-1.5">
                        <FootballSVG size={18} color="#0f172a" patchColor="#f59e0b" />
                      </span>
                    )}
                    Create Game
                  </Button>
                </motion.div>

                {createError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {createError}
                  </motion.p>
                )}

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setMode('join')}
                  className="py-4 text-base font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  } as React.CSSProperties}
                >
                  Join Game
                </Button>

                {/* Feature row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex justify-center gap-6 pt-2"
                >
                  {['Private Leagues', 'Live Scoring', 'Group Stage'].map((label) => (
                    <span key={label} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500/60 inline-block" />
                      {label}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ── Join PIN entry ── */}
            {mode === 'join' && (
              <motion.div
                key="join"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div
                  className="rounded-2xl p-6 space-y-5"
                  style={{
                    background: 'rgba(10, 18, 34, 0.88)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.05) inset',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <span className="text-lg">🏟️</span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Enter the stadium</h2>
                      <p className="text-xs text-gray-500">Enter your 6-character game PIN</p>
                    </div>
                  </div>

                  <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <Input
                      label="Game PIN"
                      placeholder="ABCD12"
                      value={joinPin}
                      onChange={(e) => {
                        setJoinPin(e.target.value.toUpperCase().slice(0, 6))
                        setJoinError('')
                      }}
                      maxLength={6}
                      autoFocus
                      error={joinError}
                      className="text-center text-2xl tracking-[0.35em] font-mono uppercase"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      disabled={joinPin.trim().length !== 6}
                      className="py-3.5 text-base font-bold"
                    >
                      Join Game →
                    </Button>
                  </form>

                  <button
                    onClick={() => { setMode('idle'); setJoinPin(''); setJoinError('') }}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors w-full text-center flex items-center justify-center gap-1"
                  >
                    <span>←</span> Back to lobby
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Game created ── */}
            {mode === 'create' && created && (
              <motion.div
                key="created"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div
                  className="rounded-2xl p-6 space-y-5"
                  style={{
                    background: 'rgba(10, 18, 34, 0.92)',
                    border: '1px solid rgba(251,191,36,0.18)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.05) inset',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Status */}
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-emerald-400 text-sm font-semibold">
                      Game created — you&apos;re ready to play!
                    </span>
                  </div>

                  {/* PIN block */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(251,191,36,0.05)',
                      border: '1px solid rgba(251,191,36,0.15)',
                    }}
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">
                      Game PIN — share with players
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <motion.span
                        initial={{ opacity: 0, letterSpacing: '0.1em' }}
                        animate={{ opacity: 1, letterSpacing: '0.35em' }}
                        transition={{ duration: 0.4 }}
                        className="text-4xl font-black font-mono"
                        style={{
                          background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 60%, #fbbf24 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {created.pin}
                      </motion.span>
                      <CopyButton
                        text={created.pin}
                        label="Copy PIN"
                        copied={copied === 'pin'}
                        onCopy={() => copyToClipboard(created.pin, 'pin')}
                      />
                    </div>
                  </div>

                  {/* Admin link */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Admin link</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-gray-400 truncate flex-1 font-mono rounded-lg px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {adminUrl}
                      </span>
                      <CopyButton
                        text={adminUrl}
                        label="Copy"
                        copied={copied === 'admin'}
                        onCopy={() => copyToClipboard(adminUrl, 'admin')}
                      />
                    </div>
                    <p className="text-amber-500/70 text-xs flex items-start gap-1.5">
                      <span className="mt-px">⚠</span>
                      <span>Save this link — it grants admin access. Do not share it with players.</span>
                    </p>
                  </div>

                  {/* Pitch divider */}
                  <div className="pitch-divider" />

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/game/${created.pin}/admin?admin_token=${created.adminToken}`)}
                      className="text-sm py-3 font-semibold"
                    >
                      Open Admin
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => router.push(`/join/${created.pin}`)}
                      className="text-sm py-3 font-bold"
                    >
                      Join as Player
                    </Button>
                  </div>

                  <button
                    onClick={() => { setMode('idle'); setCreated(null) }}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
                  >
                    + Create another game
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
