'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GoalCelebrationProps {
  show: boolean
  onClose: () => void
  message?: string
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  shape: 'circle' | 'rect' | 'ribbon'
}

/* ─── Confetti burst from two corners + centre ─────────────────────────────── */
const COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', // blues
  '#10b981', '#34d399', '#6ee7b7', // greens
  '#ffffff', '#e2e8f0',             // whites/silver
  '#94a3b8', '#cbd5e1',             // slate/silver
  '#d4af37', '#f8fafc',             // gold accent + white
]

function buildParticles(W: number, H: number): Particle[] {
  const origins = [
    { x: W * 0.5, y: H * 0.38 },   // centre burst
    { x: W * 0.15, y: H * 0.5 },   // left burst
    { x: W * 0.85, y: H * 0.5 },   // right burst
  ]
  const shapes: Particle['shape'][] = ['circle', 'rect', 'ribbon']
  return Array.from({ length: 160 }, (_, i) => {
    const o = origins[i % origins.length]
    const angle = rand(0, Math.PI * 2)
    const speed = rand(4, 18)
    return {
      id: i,
      x: o.x + rand(-30, 30),
      y: o.y + rand(-20, 20),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: rand(6, 16),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(2, 8),
      rotation: rand(0, 360),
      rotationSpeed: rand(-12, 12),
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }
  })
}

/* ─── Canvas confetti component ─────────────────────────────────────────────── */
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<{ particles: Particle[]; startTime: number } | null>(null)

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      stateRef.current = null
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H

    stateRef.current = {
      particles: buildParticles(W, H),
      startTime: performance.now(),
    }

    function tick() {
      const state = stateRef.current
      const ctx = canvas!.getContext('2d')
      if (!ctx || !state) return

      const elapsed = (performance.now() - state.startTime) / 1000
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      state.particles = state.particles.filter(p => p.y < canvas!.height + 80)

      for (const p of state.particles) {
        p.vy += 0.45         // gravity
        p.vx *= 0.99         // air drag
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

        const alpha = Math.max(0, 1 - elapsed / 3.8)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.45)
        } else {
          // ribbon — thin long strip
          ctx.fillRect(-p.size, -p.size / 6, p.size * 2, p.size / 3)
        }

        ctx.restore()
      }

      if (elapsed < 4.2) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh', zIndex: 9998 }}
    />
  )
}

/* ─── Football + Net SVG ─────────────────────────────────────────────────────── */
function FootballIntoNet() {
  return (
    <div className="relative w-56 h-36 mx-auto">
      {/* Goal net */}
      <svg
        viewBox="0 0 220 140"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Net back */}
        <rect x="10" y="10" width="200" height="110" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {/* Net vertical lines */}
        {Array.from({ length: 10 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={10 + (i + 1) * (200 / 11)}
            y1="10"
            x2={10 + (i + 1) * (200 / 11)}
            y2="120"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        ))}
        {/* Net horizontal lines */}
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1="10"
            y1={10 + (i + 1) * (110 / 7)}
            x2="210"
            y2={10 + (i + 1) * (110 / 7)}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        ))}
        {/* Goal posts */}
        <line x1="10" y1="4" x2="10" y2="124" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round" />
        <line x1="210" y1="4" x2="210" y2="124" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round" />
        <line x1="8" y1="6" x2="212" y2="6" stroke="#d1d5db" strokeWidth="4" strokeLinecap="round" />
        {/* Crossbar highlight */}
        <line x1="8" y1="6" x2="212" y2="6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        {/* Ground line */}
        <line x1="0" y1="128" x2="220" y2="128" stroke="rgba(52,211,153,0.5)" strokeWidth="2" />
        <line x1="0" y1="132" x2="220" y2="132" stroke="rgba(52,211,153,0.2)" strokeWidth="1" />
      </svg>

      {/* Animated football */}
      <motion.div
        className="absolute"
        initial={{ x: -80, y: 80, rotate: 0, scale: 0.6 }}
        animate={{ x: 80, y: 30, rotate: 540, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ left: '30%', top: '10%' }}
      >
        {/* SVG football */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#f9fafb" stroke="#d1d5db" strokeWidth="0.75" />
          <polygon points="12,7.5 14.7,9.4 13.7,12.5 10.3,12.5 9.3,9.4" fill="#111827" opacity="0.85" />
          <polygon points="12,2.5 13.8,4.2 13,5.8 11,5.8 10.2,4.2" fill="#111827" opacity="0.65" />
          <polygon points="18,6 18.8,8.1 17.4,9.4 15.6,8.6 15.4,6.5" fill="#111827" opacity="0.65" />
          <polygon points="6,6 8.6,6.5 8.4,8.6 6.6,9.4 5.2,8.1" fill="#111827" opacity="0.65" />
          <polygon points="17.4,14.6 18.5,16.5 17,18 15.2,17.3 14.8,15.2" fill="#111827" opacity="0.65" />
          <polygon points="6.6,14.6 9.2,15.2 8.8,17.3 7,18 5.5,16.5" fill="#111827" opacity="0.65" />
          <polygon points="12,21.5 10.2,19.8 11,18.2 13,18.2 13.8,19.8" fill="#111827" opacity="0.65" />
        </svg>
      </motion.div>

      {/* Impact flash */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ delay: 0.65, duration: 0.4 }}
        style={{
          background: 'radial-gradient(circle at 60% 40%, rgba(59,130,246,0.6) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

/* ─── Pulse rings ────────────────────────────────────────────────────────────── */
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-blue-400/30"
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ delay, duration: 1.6, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 }}
          style={{ width: 80, height: 80 }}
        />
      ))}
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export function GoalCelebration({ show, onClose, message = 'All picks saved!' }: GoalCelebrationProps) {
  // Auto-close after 3.5 s
  useEffect(() => {
    if (!show) return
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [show, onClose])

  return (
    <>
      <ConfettiCanvas active={show} />

      <AnimatePresence>
        {show && (
          <motion.div
            key="goal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 9999 }}
            onClick={onClose}
          >
            {/* Backdrop blur */}
            <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" />

            {/* Stadium light rays */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {['-30deg', '0deg', '30deg'].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-0"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: [0, 0.15, 0], scaleY: [0, 1, 1] }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 1.2, ease: 'easeOut' }}
                  style={{
                    width: '3px',
                    height: '120%',
                    background: 'linear-gradient(to bottom, rgba(59,130,246,0.8) 0%, transparent 100%)',
                    transformOrigin: 'top center',
                    rotate: angle,
                    translateX: '-50%',
                  }}
                />
              ))}
            </div>

            {/* Card */}
            <motion.div
              initial={{ scale: 0.5, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 }}
              className="relative z-10 flex flex-col items-center gap-5 rounded-3xl px-10 py-9 text-center select-none cursor-pointer"
              style={{
                background: 'rgba(8, 15, 30, 0.92)',
                border: '1.5px solid rgba(59,130,246,0.35)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.12) inset',
                maxWidth: 340,
                width: '90vw',
              }}
              onClick={(e) => { e.stopPropagation(); onClose() }}
            >
              {/* Pulse rings behind content */}
              <PulseRings />

              {/* Football into net */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="w-full"
              >
                <FootballIntoNet />
              </motion.div>

              {/* GOAL! text */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.5 }}
              >
                <span
                  className="block text-6xl font-black tracking-wider uppercase leading-none goal-glow"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 40%, #3b82f6 70%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  GOAL!
                </span>
              </motion.div>

              {/* Pitch divider */}
              <div className="pitch-divider w-3/4" />

              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className="space-y-1"
              >
                <p className="text-white text-lg font-bold">{message}</p>
                <p className="text-gray-500 text-xs tracking-wide uppercase">Tap to dismiss</p>
              </motion.div>

              {/* Bottom glow bar */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px rounded-full"
                style={{
                  width: '60%',
                  background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7), transparent)',
                }}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
