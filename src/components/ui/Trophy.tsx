'use client'

interface TrophyProps {
  /** Placement rank: 1 = gold, 2 = silver, 3 = bronze */
  rank?: 1 | 2 | 3
  /** Size in pixels (width and height). Defaults to 24. */
  size?: number
  className?: string
}

const RANK_COLORS: Record<1 | 2 | 3, { primary: string; secondary: string; shine: string }> = {
  1: { primary: '#f59e0b', secondary: '#d97706', shine: '#fde68a' },
  2: { primary: '#94a3b8', secondary: '#64748b', shine: '#e2e8f0' },
  3: { primary: '#c2824a', secondary: '#92400e', shine: '#fcd9b0' },
}

export default function Trophy({ rank = 1, size = 24, className }: TrophyProps) {
  const { primary, secondary, shine } = RANK_COLORS[rank]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : 'Bronze'} trophy`}
      className={className}
    >
      {/* Cup body */}
      <path
        d="M7 3h10v8a5 5 0 0 1-10 0V3Z"
        fill={primary}
        stroke={secondary}
        strokeWidth="0.5"
      />
      {/* Cup shine */}
      <path
        d="M9 4h2.5v6a2.5 2.5 0 0 1-2.5-2.5V4Z"
        fill={shine}
        opacity="0.45"
      />
      {/* Left handle */}
      <path
        d="M7 5H4a2 2 0 0 0 0 4h3"
        stroke={secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M17 5h3a2 2 0 0 1 0 4h-3"
        stroke={secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stem */}
      <rect x="10.5" y="11" width="3" height="5" rx="0.5" fill={secondary} />
      {/* Base plate */}
      <rect x="7.5" y="16" width="9" height="2" rx="1" fill={primary} stroke={secondary} strokeWidth="0.5" />
      {/* Base foot */}
      <rect x="8.5" y="18" width="7" height="1.5" rx="0.75" fill={secondary} />
    </svg>
  )
}
