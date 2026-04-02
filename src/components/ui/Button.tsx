'use client'

import { motion } from 'framer-motion'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20',
  secondary:
    'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-600',
  danger:
    'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20',
  ghost:
    'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      fullWidth = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? {} : { scale: 0.97 }}
        className={[
          'inline-flex items-center justify-center gap-2',
          'px-5 py-2.5 rounded-xl text-sm transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={isDisabled}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
