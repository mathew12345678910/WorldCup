'use client'

import { useState, useEffect, useRef } from 'react'

interface LockStatus {
  locked: boolean
  lockedAt: string | null
  timeUntilLock: string | null
}

function formatTimeUntilLock(msUntilKickoff: number): string {
  if (msUntilKickoff <= 0) return '0s'

  const totalSeconds = Math.floor(msUntilKickoff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

// Threshold (in ms) below which we poll every second for countdown precision
const CLOSE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

export function useLockStatus(kickoff_utc: string): LockStatus {
  const kickoffMs = new Date(kickoff_utc).getTime()

  const compute = (): LockStatus => {
    const now = Date.now()
    const msUntil = kickoffMs - now

    if (msUntil <= 0) {
      return {
        locked: true,
        lockedAt: kickoff_utc,
        timeUntilLock: null,
      }
    }

    return {
      locked: false,
      lockedAt: null,
      timeUntilLock: formatTimeUntilLock(msUntil),
    }
  }

  const [lockStatus, setLockStatus] = useState<LockStatus>(compute)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const tick = () => {
      const next = compute()
      setLockStatus(next)
      if (next.locked && intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const msUntil = kickoffMs - Date.now()

    if (msUntil <= 0) {
      // Already locked — no need to poll
      return
    }

    // Poll every second when within threshold, otherwise every minute
    const pollInterval = msUntil <= CLOSE_THRESHOLD_MS ? 1000 : 60_000

    intervalRef.current = setInterval(tick, pollInterval)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // Intentionally only re-run when the kickoff string changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kickoff_utc])

  return lockStatus
}
