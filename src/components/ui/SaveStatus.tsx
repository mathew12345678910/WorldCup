'use client'

import { motion, AnimatePresence } from 'framer-motion'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'locked'

interface SaveStatusProps {
  state: SaveState
  className?: string
}

const config: Record<
  SaveState,
  { label: string; color: string; icon: React.ReactNode } | null
> = {
  idle: null,
  saving: {
    label: 'Saving…',
    color: 'text-gray-400',
    icon: (
      <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ),
  },
  saved: {
    label: 'Saved',
    color: 'text-emerald-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M2.5 8.5l3.5 3.5 7-7"
        />
      </svg>
    ),
  },
  error: {
    label: 'Error saving',
    color: 'text-red-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          d="M8 5v4M8 11.5v.5"
        />
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  locked: {
    label: 'Locked',
    color: 'text-amber-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
        <rect
          x="3"
          y="7"
          width="10"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
          d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
        />
      </svg>
    ),
  },
}

export function SaveStatus({ state, className = '' }: SaveStatusProps) {
  const info = config[state]

  return (
    <AnimatePresence mode="wait">
      {info && (
        <motion.span
          key={state}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${info.color} ${className}`}
        >
          {info.icon}
          {info.label}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
