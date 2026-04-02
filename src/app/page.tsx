'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/Button'

/* ─── Particle star field (CSS only, no canvas) ──────────────────────────── */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${(i * 17 + 3) % 100}%`,
  left: `${(i * 23 + 7) % 100}%`,
  size: i % 3 === 0 ? 2 : 1,
  delay: `${(i * 0.37) % 5}s`,
  duration: `${3 + (i % 4)}s`,
  opacity: 0.15 + (i % 5) * 0.07,
}))

/* ─── Background layers ──────────────────────────────────────────────────── */
function BackgroundLayers() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Deep navy base gradient */}
      <div className="absolute inset-0 bg-[#0a1628]" />

      {/* Primary radial glow — top center blue */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2"
        style={{
          width: '120%',
          height: '70%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0.06) 40%, transparent 70%)',
        }}
      />

      {/* Secondary glow — emerald lower left */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: '60%',
          height: '50%',
          background: 'radial-gradient(ellipse at 0% 100%, rgba(16,185,129,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Accent glow — blue lower right */}
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: '55%',
          height: '45%',
          background: 'radial-gradient(ellipse at 100% 100%, rgba(59,130,246,0.1) 0%, transparent 55%)',
        }}
      />

      {/* Center deep glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />

      {/* Star field */}
      {STARS.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-star-pulse"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            background: '#fff',
            opacity: star.opacity,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      {/* Horizontal pitch lines at very bottom */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 160 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              bottom: i * 24,
              height: 1,
              background: `rgba(37,99,235,${0.03 + i * 0.015})`,
            }}
          />
        ))}
      </div>

      {/* Large trophy/stadium silhouette — giant faint SVG */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none select-none"
        style={{ opacity: 0.028, transform: 'translate(15%, 8%)' }}
      >
        <svg width="600" height="600" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Trophy cup silhouette */}
          <path
            d="M70 10 L130 10 L140 20 L145 50 C145 80 130 95 110 100 L110 130 L130 140 L130 155 L70 155 L70 140 L90 130 L90 100 C70 95 55 80 55 50 L60 20 Z"
            fill="white"
          />
          {/* Trophy base */}
          <rect x="75" y="155" width="50" height="10" rx="2" fill="white" />
          <rect x="65" y="165" width="70" height="8" rx="2" fill="white" />
          {/* Handles */}
          <path d="M55 25 C35 25 25 35 25 50 C25 65 35 75 55 75" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M145 25 C165 25 175 35 175 50 C175 65 165 75 145 75" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Grid dot pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.018) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  )
}

/* ─── Animated football SVG ──────────────────────────────────────────────── */
function FootballSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="white" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {/* Central pentagon */}
      <polygon points="40,25 52,33 48,47 32,47 28,33" fill="#0a1628" opacity="0.9" />
      {/* Top */}
      <polygon points="40,8 46,15 43,22 37,22 34,15" fill="#0a1628" opacity="0.7" />
      {/* Top-right */}
      <polygon points="58,18 63,26 57,33 50,31 49,23" fill="#0a1628" opacity="0.7" />
      {/* Top-left */}
      <polygon points="22,18 31,23 30,31 23,33 17,26" fill="#0a1628" opacity="0.7" />
      {/* Bottom-right */}
      <polygon points="63,54 57,60 50,58 48,50 55,45" fill="#0a1628" opacity="0.7" />
      {/* Bottom-left */}
      <polygon points="17,54 25,45 32,50 30,58 23,60" fill="#0a1628" opacity="0.7" />
      {/* Bottom */}
      <polygon points="40,72 34,65 37,58 43,58 46,65" fill="#0a1628" opacity="0.7" />
    </svg>
  )
}

/* ─── Hero section ──────────────────────────────────────────────────────── */
function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-32">
      <BackgroundLayers />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto w-full">

        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="inline-flex items-center gap-2.5 mb-10 px-5 py-2 rounded-full text-sm font-semibold tracking-wide"
          style={{
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#93c5fd',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}
          />
          FIFA World Cup 2026
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}
          />
        </motion.div>

        {/* Bouncing ball */}
        <motion.div
          className="mb-10 relative"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          {/* Glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)',
              filter: 'blur(12px)',
            }}
          />
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
          >
            <FootballSVG size={88} />
          </motion.div>
          {/* Ball shadow */}
          <motion.div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full"
            animate={{ scaleX: [1, 0.65, 1], opacity: [0.25, 0.1, 0.25] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
            style={{ width: 60, height: 10, background: 'rgba(0,0,0,0.5)', filter: 'blur(6px)' }}
          />
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.25 }}
          className="mb-5"
        >
          <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-black leading-none tracking-tight">
            <span className="text-gradient-blue block">WC26</span>
            <span className="text-gradient-blue-white block">PREDICTOR</span>
          </h1>
        </motion.div>

        {/* Divider line */}
        <motion.div
          className="pitch-divider-blue w-48 mb-8"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55 }}
          className="text-[clamp(1rem,2.5vw,1.25rem)] text-blue-200/70 font-light leading-relaxed max-w-lg mb-14 tracking-wide"
        >
          Predict every match. Compete with friends. Claim glory at the world&apos;s biggest tournament.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/join/GAME01')}
            className="relative group px-10 py-5 rounded-2xl font-black text-lg tracking-wider overflow-hidden text-white"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #3b82f6 100%)',
              boxShadow: '0 8px 32px rgba(37,99,235,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {/* Shimmer sweep */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-sweep 2.5s linear infinite',
              }}
            />
            <span className="relative flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              Make Your Picks
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              >
                →
              </motion.span>
            </span>
          </motion.button>

          <p className="text-blue-300/40 text-sm tracking-widest uppercase font-medium">
            Free to play · No account needed
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <span className="text-blue-300/30 text-xs uppercase tracking-widest font-medium">Scroll</span>
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-blue-400/40 to-transparent"
            animate={{ scaleY: [0, 1, 0], originY: 'top' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
          />
        </motion.div>
      </div>
    </section>
  )
}

/* ─── How it works section ───────────────────────────────────────────────── */
const STEPS = [
  {
    number: '01',
    icon: '🎯',
    title: 'Join the Game',
    description: 'Enter once and you\'re in. No account creation, no friction — just instant access to the prediction arena.',
    accent: 'rgba(37,99,235,0.3)',
    glow: 'rgba(37,99,235,0.15)',
  },
  {
    number: '02',
    icon: '📋',
    title: 'Make Your Picks',
    description: 'Predict the winner of every group stage match and knockout round. Lock in your predictions before kick-off.',
    accent: 'rgba(16,185,129,0.3)',
    glow: 'rgba(16,185,129,0.12)',
  },
  {
    number: '03',
    icon: '🏆',
    title: 'Climb the Board',
    description: 'Score points for every correct prediction. Watch the live leaderboard and fight for the top spot.',
    accent: 'rgba(212,175,55,0.3)',
    glow: 'rgba(212,175,55,0.1)',
  },
]

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative group flex flex-col"
    >
      {/* Connector line (not on last card) */}
      {index < STEPS.length - 1 && (
        <div
          className="hidden lg:block absolute top-12 left-[calc(100%+0px)] w-full h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.05) 100%)',
            zIndex: 0,
          }}
        />
      )}

      <div
        className="relative rounded-2xl p-8 h-full flex flex-col transition-all duration-300"
        style={{
          background: 'rgba(10,22,40,0.75)',
          border: `1px solid ${step.accent}`,
          backdropFilter: 'blur(16px)',
          boxShadow: `0 0 40px ${step.glow}, 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${step.glow} 0%, transparent 60%)` }}
        />

        {/* Step number */}
        <div className="flex items-start justify-between mb-6">
          <span
            className="text-5xl font-black leading-none"
            style={{
              background: `linear-gradient(135deg, ${step.accent.replace('0.3', '0.9')}, ${step.accent.replace('0.3', '0.4')})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {step.number}
          </span>
          <span className="text-4xl">{step.icon}</span>
        </div>

        {/* Divider */}
        <div
          className="w-12 h-0.5 mb-6"
          style={{ background: `linear-gradient(90deg, ${step.accent}, transparent)` }}
        />

        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{step.title}</h3>
        <p className="text-blue-200/55 text-sm leading-relaxed font-light flex-1">{step.description}</p>
      </div>
    </motion.div>
  )
}

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="relative py-24 px-4">
      {/* Section background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(37,99,235,0.04) 50%, transparent 100%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section header */}
        <div ref={ref} className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-blue-400 text-sm font-semibold uppercase tracking-[0.2em] mb-4"
          >
            How It Works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-[clamp(2rem,5vw,3.25rem)] font-black text-white leading-tight tracking-tight mb-5"
          >
            Three steps to{' '}
            <span className="text-gradient-emerald">victory</span>
          </motion.h2>
          <motion.div
            className="pitch-divider-blue w-32 mx-auto mb-5"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-blue-200/50 max-w-md mx-auto text-base font-light leading-relaxed"
          >
            Simple enough for anyone, deep enough to keep you hooked through every knockout round.
          </motion.p>
        </div>

        {/* Step cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            variant="primary"
            onClick={() => typeof window !== 'undefined' && (window.location.href = '/join/GAME01')}
            className="px-8 py-4 text-base font-bold tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
              boxShadow: '0 4px 24px rgba(37,99,235,0.4)',
            } as React.CSSProperties}
          >
            Enter Game — Make Your Picks
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative border-t border-blue-900/30 py-12 px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(10,22,40,0.6))' }}
      />
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand mark */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
            }}
          >
            <span className="text-white text-xs font-black">W</span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">WC26 Predictor</span>
        </div>

        {/* Center tag */}
        <div className="flex items-center gap-2 text-blue-300/30 text-xs font-medium tracking-widest uppercase">
          <span
            className="w-1 h-1 rounded-full bg-emerald-400/60 inline-block"
            style={{ boxShadow: '0 0 4px rgba(52,211,153,0.6)' }}
          />
          FIFA World Cup 2026
          <span
            className="w-1 h-1 rounded-full bg-emerald-400/60 inline-block"
            style={{ boxShadow: '0 0 4px rgba(52,211,153,0.6)' }}
          />
        </div>

        {/* Right side */}
        <p className="text-blue-300/25 text-xs font-light">
          Fan-made prediction game
        </p>
      </div>
    </footer>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0a1628] text-white overflow-x-hidden">
      <HeroSection />
      <HowItWorksSection />
      <Footer />
    </div>
  )
}
