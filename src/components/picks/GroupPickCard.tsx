'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { SaveStatus, SaveState } from '@/components/ui/SaveStatus'
import type { Team, GroupPick } from '@/types/database'

interface GroupPickCardProps {
  groupLetter: string
  teams: Team[]
  playerId: string
  existingPicks: GroupPick[]
  locked: boolean
  onSave: (
    groupLetter: string,
    firstTeamId: number | null,
    secondTeamId: number | null,
    isJoker: boolean
  ) => Promise<void>
  jokerUsed: boolean
}

export function GroupPickCard({
  groupLetter,
  teams,
  playerId,
  existingPicks,
  locked,
  onSave,
  jokerUsed,
}: GroupPickCardProps) {
  const existing1st = existingPicks.find((p) => p.position === 1)
  const existing2nd = existingPicks.find((p) => p.position === 2)
  const existingJoker = existingPicks.some((p) => p.is_joker)

  const [firstPlace, setFirstPlace] = useState<string>(
    existing1st ? String(existing1st.team_id) : ''
  )
  const [secondPlace, setSecondPlace] = useState<string>(
    existing2nd ? String(existing2nd.team_id) : ''
  )
  const [isJoker, setIsJoker] = useState(existingJoker)
  const [saveState, setSaveState] = useState<SaveState>(locked ? 'locked' : 'idle')

  const isDirty =
    firstPlace !== (existing1st ? String(existing1st.team_id) : '') ||
    secondPlace !== (existing2nd ? String(existing2nd.team_id) : '') ||
    isJoker !== existingJoker

  const handleSave = useCallback(async () => {
    if (locked) return
    setSaveState('saving')
    try {
      await onSave(
        groupLetter,
        firstPlace ? Number(firstPlace) : null,
        secondPlace ? Number(secondPlace) : null,
        isJoker
      )
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }, [groupLetter, firstPlace, secondPlace, isJoker, locked, onSave])

  // Auto-save on change after 800ms debounce
  useEffect(() => {
    if (!isDirty || locked) return
    const timer = setTimeout(handleSave, 800)
    return () => clearTimeout(timer)
  }, [firstPlace, secondPlace, isJoker, isDirty, locked, handleSave])

  const canToggleJoker = !jokerUsed || isJoker

  const selectClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Group{' '}
            <span className="text-amber-400 font-semibold">{groupLetter}</span>
          </span>
          <SaveStatus state={saveState} />
        </div>
      }
    >
      <div className="space-y-3">
        {/* Teams list */}
        <div className="flex flex-wrap gap-2 mb-3">
          {teams.map((team) => (
            <span
              key={team.id}
              className="inline-flex items-center gap-1.5 text-xs bg-gray-800/80 border border-gray-700/50 rounded-lg px-2.5 py-1 text-gray-300"
            >
              {team.flag_url ? (
                <img
                  src={team.flag_url}
                  alt={team.code}
                  className="w-4 h-3 object-cover rounded-sm"
                />
              ) : (
                <span className="w-4 h-3 bg-gray-700 rounded-sm flex-shrink-0" />
              )}
              {team.name}
            </span>
          ))}
        </div>

        {/* Picks */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">1st place</label>
            <select
              value={firstPlace}
              onChange={(e) => {
                setFirstPlace(e.target.value)
                if (e.target.value === secondPlace) setSecondPlace('')
              }}
              disabled={locked}
              className={selectClass}
            >
              <option value="">— pick team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={String(t.id) === secondPlace}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">2nd place</label>
            <select
              value={secondPlace}
              onChange={(e) => {
                setSecondPlace(e.target.value)
                if (e.target.value === firstPlace) setFirstPlace('')
              }}
              disabled={locked}
              className={selectClass}
            >
              <option value="">— pick team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={String(t.id) === firstPlace}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Joker toggle */}
        <button
          onClick={() => canToggleJoker && !locked && setIsJoker((v) => !v)}
          disabled={locked || (!canToggleJoker && !isJoker)}
          className={[
            'flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors',
            isJoker
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              : 'bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-gray-200',
            locked || (!canToggleJoker && !isJoker)
              ? 'opacity-40 cursor-not-allowed'
              : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="text-base">🃏</span>
          <span>{isJoker ? 'Joker active (2× points)' : 'Use joker for this group'}</span>
        </button>
      </div>
    </Card>
  )
}
