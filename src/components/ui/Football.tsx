'use client'

interface FootballProps {
  /** Size in pixels. Defaults to 24. */
  size?: number
  className?: string
  /** Fill color for the ball. Defaults to white. */
  color?: string
  /** Color for the pentagon patches. Defaults to near-black. */
  patchColor?: string
}

export default function Football({
  size = 24,
  className,
  color = '#f9fafb',
  patchColor = '#111827',
}: FootballProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Ball outline */}
      <circle cx="12" cy="12" r="10" fill={color} stroke="#d1d5db" strokeWidth="0.75" />

      {/* Center pentagon */}
      <polygon
        points="12,7.5 14.7,9.4 13.7,12.5 10.3,12.5 9.3,9.4"
        fill={patchColor}
        opacity="0.85"
      />

      {/* Top patch */}
      <polygon
        points="12,2.5 13.8,4.2 13,5.8 11,5.8 10.2,4.2"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Top-right patch */}
      <polygon
        points="18,6 18.8,8.1 17.4,9.4 15.6,8.6 15.4,6.5"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Top-left patch */}
      <polygon
        points="6,6 8.6,6.5 8.4,8.6 6.6,9.4 5.2,8.1"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Bottom-right patch */}
      <polygon
        points="17.4,14.6 18.5,16.5 17,18 15.2,17.3 14.8,15.2"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Bottom-left patch */}
      <polygon
        points="6.6,14.6 9.2,15.2 8.8,17.3 7,18 5.5,16.5"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Bottom patch */}
      <polygon
        points="12,21.5 10.2,19.8 11,18.2 13,18.2 13.8,19.8"
        fill={patchColor}
        opacity="0.65"
      />

      {/* Seam lines connecting patches */}
      <line x1="12" y1="5.8" x2="12" y2="7.5" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="15.4" y1="6.5" x2="14.7" y2="9.4" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="8.6" y1="6.5" x2="9.3" y2="9.4" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="17.4" y1="9.4" x2="14.7" y2="9.4" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="6.6" y1="9.4" x2="9.3" y2="9.4" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="13.7" y1="12.5" x2="14.8" y2="15.2" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="10.3" y1="12.5" x2="9.2" y2="15.2" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="15.2" y1="17.3" x2="13" y2="18.2" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
      <line x1="8.8" y1="17.3" x2="11" y2="18.2" stroke={patchColor} strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}
