'use client'

import { motion } from 'framer-motion'
import { pulseGlowKeyframes, pulseGlowTransition } from '@/lib/animations'

// ─── Variant definitions ──────────────────────────────────────────────────────

export type BadgeVariant =
  | 'unpaid'
  | 'locked'
  | 'live'
  | 'saved'
  | 'saving'
  | 'error'
  | 'info'
  | 'success'
  | 'warning'
  | 'default'

interface VariantStyle {
  bg: string
  text: string
  border: string
  dot?: string
  animate?: boolean
}

const VARIANT_STYLES: Record<BadgeVariant, VariantStyle> = {
  unpaid: {
    bg: 'rgba(245,158,11,0.15)',
    text: '#fbbf24',
    border: 'rgba(245,158,11,0.35)',
  },
  locked: {
    bg: 'rgba(107,114,128,0.15)',
    text: '#9ca3af',
    border: 'rgba(107,114,128,0.3)',
  },
  live: {
    bg: 'rgba(16,185,129,0.15)',
    text: '#34d399',
    border: 'rgba(16,185,129,0.35)',
    dot: '#10b981',
    animate: true,
  },
  saved: {
    bg: 'rgba(16,185,129,0.12)',
    text: '#10b981',
    border: 'rgba(16,185,129,0.3)',
  },
  saving: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#f59e0b',
    border: 'rgba(245,158,11,0.3)',
    dot: '#f59e0b',
    animate: true,
  },
  error: {
    bg: 'rgba(239,68,68,0.12)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.3)',
  },
  info: {
    bg: 'rgba(59,130,246,0.12)',
    text: '#60a5fa',
    border: 'rgba(59,130,246,0.3)',
  },
  success: {
    bg: 'rgba(16,185,129,0.12)',
    text: '#10b981',
    border: 'rgba(16,185,129,0.3)',
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#f59e0b',
    border: 'rgba(245,158,11,0.3)',
  },
  default: {
    bg: 'rgba(99,102,241,0.12)',
    text: '#818cf8',
    border: 'rgba(99,102,241,0.3)',
  },
}

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  unpaid: 'Unpaid',
  locked: 'Locked',
  live: 'Live',
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Error',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  default: 'Default',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: BadgeVariant
  /** Override the displayed label text */
  label?: string
  className?: string
  /** Extra inline styles */
  style?: React.CSSProperties
}

export default function Badge({
  variant = 'default',
  label,
  className,
  style,
}: BadgeProps) {
  const styles = VARIANT_STYLES[variant]
  const text = label ?? VARIANT_LABELS[variant]

  const dotVariants = styles.animate
    ? {
        animate: pulseGlowKeyframes,
        transition: pulseGlowTransition,
      }
    : {}

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        paddingInline: '0.55rem',
        paddingBlock: '0.2rem',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'Poppins, sans-serif',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
    >
      {styles.dot && (
        <motion.span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: styles.dot,
            flexShrink: 0,
          }}
          {...dotVariants}
        />
      )}
      {text}
    </span>
  )
}
