export const colors = {
  bg: {
    primary: '#030712',
    secondary: '#111827',
    card: '#1f2937',
    cardHover: '#374151',
  },
  accent: {
    primary: '#2563eb',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#60a5fa',
  },
  text: {
    primary: '#f9fafb',
    secondary: '#9ca3af',
    muted: '#6b7280',
  },
  avatar: [
    '#2563eb',
    '#ec4899',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ef4444',
    '#06b6d4',
    '#d4af37',
  ],
  status: {
    saving: '#3b82f6',
    saved: '#10b981',
    error: '#ef4444',
    locked: '#6b7280',
  },
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const

export const shadows = {
  card: '0 4px 6px -1px rgba(0,0,0,0.3)',
  cardHover: '0 10px 15px -3px rgba(0,0,0,0.4)',
  glow: '0 0 15px rgba(99,102,241,0.3)',
} as const

export const typography = {
  fontFamily: {
    primary: ['Poppins', 'sans-serif'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const

export const transitions = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '300ms ease',
  bounce: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
} as const
