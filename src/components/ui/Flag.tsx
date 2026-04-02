'use client'

import { useState } from 'react'

// ─── FIFA code → ISO 3166-1 alpha-2 mapping ──────────────────────────────────
// Covers all 48 teams in the expanded 2026 World Cup format
const FIFA_TO_ISO: Record<string, string> = {
  // Group A / Americas hosts
  USA: 'us',
  CAN: 'ca',
  MEX: 'mx',

  // South America
  BRA: 'br',
  ARG: 'ar',
  URU: 'uy',
  COL: 'co',
  ECU: 'ec',
  CHI: 'cl',
  PAR: 'py',
  BOL: 'bo',
  VEN: 've',
  PER: 'pe',

  // Europe
  ENG: 'gb-eng',
  FRA: 'fr',
  GER: 'de',
  ESP: 'es',
  POR: 'pt',
  NED: 'nl',
  BEL: 'be',
  ITA: 'it',
  CRO: 'hr',
  SUI: 'ch',
  DEN: 'dk',
  AUT: 'at',
  POL: 'pl',
  SRB: 'rs',
  SVK: 'sk',
  SCO: 'gb-sct',
  WAL: 'gb-wls',
  TUR: 'tr',
  CZE: 'cz',
  HUN: 'hu',
  GRE: 'gr',
  UKR: 'ua',
  NOR: 'no',
  SWE: 'se',
  ROU: 'ro',
  ALB: 'al',
  SVN: 'si',

  // Africa
  MAR: 'ma',
  SEN: 'sn',
  NGA: 'ng',
  CMR: 'cm',
  GHA: 'gh',
  CIV: 'ci',
  EGY: 'eg',
  TUN: 'tn',
  ALG: 'dz',
  RSA: 'za',
  MLI: 'ml',
  GAB: 'ga',

  // Asia / Oceania
  JPN: 'jp',
  KOR: 'kr',
  AUS: 'au',
  IRN: 'ir',
  SAU: 'sa',
  QAT: 'qa',
  IRQ: 'iq',
  JOR: 'jo',
  UZB: 'uz',
  NZL: 'nz',
  CHN: 'cn',
  IND: 'in',
  THA: 'th',
  VIE: 'vn',
  IDN: 'id',
  OMA: 'om',
  BHR: 'bh',
  KUW: 'kw',
  UAE: 'ae',
  PHI: 'ph',

  // CONCACAF (non-host)
  CRC: 'cr',
  HON: 'hn',
  PAN: 'pa',
  JAM: 'jm',
  TRI: 'tt',
  HAI: 'ht',
  CUB: 'cu',
  SLV: 'sv',
  GUA: 'gt',
  NCA: 'ni',
  BLZ: 'bz',
  ATG: 'ag',
}

// ─── Avatar fallback colors ───────────────────────────────────────────────────
const FALLBACK_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4',
]

function getFallbackColor(code: string): string {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FlagProps {
  /** FIFA three-letter team code, e.g. "BRA", "ENG", "USA" */
  code: string
  /** Display size in pixels. Defaults to 32. */
  size?: number
  className?: string
  /** Optional override for the alt/accessible name */
  label?: string
}

export default function Flag({ code, size = 32, className, label }: FlagProps) {
  const [errored, setErrored] = useState(false)

  const upperCode = code.toUpperCase()
  const isoCode = FIFA_TO_ISO[upperCode]
  const initials = upperCode.slice(0, 3)
  const fallbackColor = getFallbackColor(upperCode)
  const altText = label ?? upperCode

  if (!isoCode || errored) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: fallbackColor,
          color: '#fff',
          fontSize: Math.max(8, Math.round(size * 0.32)),
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          flexShrink: 0,
          userSelect: 'none',
        }}
        aria-label={altText}
        title={altText}
      >
        {initials}
      </span>
    )
  }

  const src = `https://flagcdn.com/w40/${isoCode}.png`
  const src2x = `https://flagcdn.com/w80/${isoCode}.png`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={`${src} 1x, ${src2x} 2x`}
      alt={altText}
      title={altText}
      width={size}
      height={Math.round(size * 0.67)}
      className={className}
      style={{
        display: 'inline-block',
        objectFit: 'cover',
        borderRadius: 2,
        flexShrink: 0,
      }}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}
