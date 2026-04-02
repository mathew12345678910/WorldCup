'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  debounceMs?: number
  locked?: boolean
}

interface UseAutosaveResult {
  status: SaveStatus
  retry: () => void
}

export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options?: UseAutosaveOptions
): UseAutosaveResult {
  const { debounceMs = 500, locked = false } = options ?? {}

  const [status, setStatus] = useState<SaveStatus>('idle')

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDataRef = useRef<string>(JSON.stringify(data))
  const latestDataRef = useRef<T>(data)
  const latestSaveFnRef = useRef<(data: T) => Promise<void>>(saveFn)

  // Keep refs up-to-date without re-triggering the debounce effect
  latestDataRef.current = data
  latestSaveFnRef.current = saveFn

  const clearAllTimers = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const performSave = useCallback(async (dataToSave: T) => {
    setStatus('saving')
    try {
      await latestSaveFnRef.current(dataToSave)
      setStatus('saved')
      resetTimerRef.current = setTimeout(() => {
        setStatus('idle')
        resetTimerRef.current = null
      }, 2000)
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError && err.message.toLowerCase().includes('fetch')

      if (isNetworkError) {
        // Retry once after 2s
        retryTimerRef.current = setTimeout(async () => {
          retryTimerRef.current = null
          try {
            await latestSaveFnRef.current(dataToSave)
            setStatus('saved')
            resetTimerRef.current = setTimeout(() => {
              setStatus('idle')
              resetTimerRef.current = null
            }, 2000)
          } catch {
            setStatus('error')
          }
        }, 2000)
      } else {
        setStatus('error')
      }
    }
  }, [])

  // Debounced save effect
  useEffect(() => {
    if (locked) return

    const serialised = JSON.stringify(data)
    if (serialised === prevDataRef.current) return

    prevDataRef.current = serialised

    // Clear any pending debounce
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    // Clear any pending reset so status doesn't flicker
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      performSave(latestDataRef.current)
    }, debounceMs)
  }, [data, locked, debounceMs, performSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  const retry = useCallback(() => {
    if (status !== 'error') return
    clearAllTimers()
    performSave(latestDataRef.current)
  }, [status, clearAllTimers, performSave])

  return { status, retry }
}
