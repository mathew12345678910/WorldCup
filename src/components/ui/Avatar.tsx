interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
}

export function Avatar({ name, color, size = 'md', className = '' }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-gray-950 flex-shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={`Avatar for ${name}`}
    >
      {initial}
    </div>
  )
}
