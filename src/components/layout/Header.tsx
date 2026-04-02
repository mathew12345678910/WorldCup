'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Football from '@/components/ui/Football'
import { floatKeyframes, floatTransition } from '@/lib/animations'

// ─── Nav link definition ──────────────────────────────────────────────────────

interface NavLink {
  href: string
  label: string
}

const NAV_LINKS: NavLink[] = [
  { href: '/game/picks', label: 'My Picks' },
  { href: '/game/leaderboard', label: 'Leaderboard' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname()

  return (
    <header
      style={{
        backgroundColor: 'rgba(3,7,18,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: '72rem',
          marginInline: 'auto',
          paddingInline: '1.5rem',
          paddingBlock: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* ── Brand ── */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <motion.span
            animate={floatKeyframes}
            transition={floatTransition}
            style={{ display: 'inline-flex', lineHeight: 1 }}
            aria-hidden="true"
          >
            <Football size={28} color="#f9fafb" patchColor="#111827" />
          </motion.span>
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.125rem',
              letterSpacing: '-0.01em',
              color: '#f9fafb',
              lineHeight: 1,
            }}
          >
            WC26{' '}
            <span style={{ color: '#6366f1' }}>Predictor</span>
          </span>
        </Link>

        {/* ── Nav ── */}
        <nav aria-label="Main navigation">
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + '/')

              return (
                <li key={href}>
                  <Link
                    href={href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      paddingInline: '0.875rem',
                      paddingBlock: '0.45rem',
                      borderRadius: '0.5rem',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      textDecoration: 'none',
                      color: isActive ? '#818cf8' : '#9ca3af',
                      backgroundColor: isActive
                        ? 'rgba(99,102,241,0.12)'
                        : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                      transition: 'all 150ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.color = '#d1d5db'
                        el.style.backgroundColor = 'rgba(255,255,255,0.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.color = '#9ca3af'
                        el.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
