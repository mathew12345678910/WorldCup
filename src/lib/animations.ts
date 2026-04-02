import type { Variants, Transition } from 'framer-motion'

// ─── Fade In ─────────────────────────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

export const fadeInFast: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// ─── Stagger Container ───────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
}

// ─── Card Hover ──────────────────────────────────────────────────────────────
export const cardHover: Variants = {
  rest: {
    scale: 1,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hover: {
    scale: 1.015,
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// ─── Slide In ────────────────────────────────────────────────────────────────
export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
}

// ─── Progress Step ───────────────────────────────────────────────────────────
/** Scale bounce when completing a progress step */
export const progressStep: Variants = {
  incomplete: { scale: 1, opacity: 0.5 },
  complete: {
    scale: [1, 1.25, 1],
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: 'easeInOut',
      times: [0, 0.5, 1],
    },
  },
  active: {
    scale: 1.05,
    opacity: 1,
    transition: { duration: 0.2 },
  },
}

// ─── Pulse Glow ──────────────────────────────────────────────────────────────
/** Subtle glow animation for active / live states */
export const pulseGlow: Variants = {
  rest: {
    boxShadow: '0 0 0px rgba(99,102,241,0)',
    transition: { duration: 1.5, repeat: Infinity, repeatType: 'reverse' },
  },
  pulse: {
    boxShadow: [
      '0 0 0px rgba(99,102,241,0)',
      '0 0 18px rgba(99,102,241,0.45)',
      '0 0 0px rgba(99,102,241,0)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
}

export const pulseGlowTransition: Transition = {
  duration: 2,
  ease: 'easeInOut',
  repeat: Infinity,
}

export const pulseGlowKeyframes = {
  boxShadow: [
    '0 0 0px rgba(99,102,241,0)',
    '0 0 18px rgba(99,102,241,0.45)',
    '0 0 0px rgba(99,102,241,0)',
  ],
}

// ─── Page Transition ─────────────────────────────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
}

// ─── List Item ───────────────────────────────────────────────────────────────
/** For leaderboard rows with stagger */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

export const listItemHover: Variants = {
  rest: { backgroundColor: 'rgba(31,41,55,1)', x: 0 },
  hover: {
    backgroundColor: 'rgba(55,65,81,1)',
    x: 2,
    transition: { duration: 0.15 },
  },
}

// ─── Scale Pop ───────────────────────────────────────────────────────────────
export const scalePop: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 22,
    },
  },
}

// ─── Spin ────────────────────────────────────────────────────────────────────
export const spinTransition: Transition = {
  repeat: Infinity,
  ease: 'linear',
  duration: 1,
}

// ─── Float ───────────────────────────────────────────────────────────────────
export const floatKeyframes = {
  y: [0, -8, 0],
}

export const floatTransition: Transition = {
  duration: 3,
  ease: 'easeInOut',
  repeat: Infinity,
}

// ─── Button Press ────────────────────────────────────────────────────────────
export const buttonPress: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.96, transition: { duration: 0.1 } },
  hover: { scale: 1.03, transition: { duration: 0.15 } },
}
