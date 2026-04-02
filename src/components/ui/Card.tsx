import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  header?: ReactNode
  className?: string
  glass?: boolean
  padding?: boolean
}

export function Card({
  children,
  header,
  className = '',
  glass = false,
  padding = true,
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl overflow-hidden',
        glass
          ? 'card-glass'
          : 'bg-gray-900 border border-gray-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          {header}
        </div>
      )}
      {padding ? <div className="p-5">{children}</div> : children}
    </div>
  )
}
