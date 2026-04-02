'use client'

import { motion } from 'framer-motion'
import { spinTransition } from '@/lib/animations'

interface LoadingSpinnerProps {
  /** Size in pixels. Defaults to 32. */
  size?: number
  /** Stroke color. Defaults to indigo accent. */
  color?: string
  /** Track color. Defaults to semi-transparent. */
  trackColor?: string
  className?: string
  /** Accessible label. Defaults to "Loading…" */
  label?: string
}

export default function LoadingSpinner({
  size = 32,
  color = '#6366f1',
  trackColor = 'rgba(99,102,241,0.15)',
  className,
  label = 'Loading\u2026',
}: LoadingSpinnerProps) {
  const strokeWidth = Math.max(2, Math.round(size * 0.1))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <span
      role="status"
      aria-label={label}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        animate={{ rotate: 360 }}
        transition={spinTransition}
        style={{ display: 'block' }}
      >
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Spinning arc — ~75% of circumference */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </motion.svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
