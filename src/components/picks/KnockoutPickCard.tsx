'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { SaveStatus, SaveState } from '@/components/ui/SaveStatus'
import Flag from '@/components/ui/Flag'
import type { Match, Team, KnockoutPick, MatchStage } from '@/types/database'

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: 'Group Stage',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  THIRD: 'Third Place',
  FINAL: 'Final',
}

interface KnockoutPickCardProps {
  match: Match
  homeTeam: Team | undefined
  awayTeam: Team | undefined
  existingPick: KnockoutPick | undefined
  locked: boolean
  onSave: (matchId: number, teamId: number, isJoker: boolean) => Promise<void>
  jokerUsedInRound: boolean
}

export function KnockoutPickCard({
  match,
  homeTeam,
  awayTeam,
  existingPick,
  locked,
  onSave,
  jokerUsedInRound,
}: KnockoutPickCardProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    existingPick ? String(existingPick.team_id) : ''
  )
  const [isJoker, setIsJoker] = useState(existingPick?.is_joker ?? false)
  const [saveState, setSaveState] = useState<SaveState>(locked ? 'locked' : 'idle')

  const isDirty =
    selectedTeamId !== (existingPick ? String(existingPick.team_id) : '') ||
    isJoker !== (existingPick?.is_joker ?? false)

  const handleSave = useCallback(async () => {
    if (locked || !selectedTeamId) return
    setSaveState('saving')
    try {
      await onSave(match.id, Number(selectedTeamId), isJoker)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }, [locked, match.id, selectedTeamId, isJoker, onSave])

  useEffect(() => {
    if (!isDirty || locked || !selectedTeamId) return
    const timer = setTimeout(handleSave, 800)
    return () => clearTimeout(timer)
  }, [selectedTeamId, isJoker, isDirty, locked, handleSave])

  const kickoffDate = new Date(match.kickoff_utc)
  const kickoffStr = kickoffDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  const canToggleJoker = !jokerUsedInRound || isJoker
  const teamsKnown = homeTeam !== undefined && awayTeam !== undefined

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-md">
              {STAGE_LABELS[match.stage]}
            </span>
            {match.venue && (
              <span className="text-xs text-gray-500 hidden sm:inline">{match.venue}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{kickoffStr} UTC</span>
            <SaveStatus state={saveState} />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {teamsKnown ? (
          <div className="grid grid-cols-2 gap-3">
            {[homeTeam, awayTeam].map((team) => {
              const isSelected = selectedTeamId === String(team.id)
              return (
                <button
                  key={team.id}
                  onClick={() => {
                    if (locked) return
                    setSelectedTeamId(isSelected ? '' : String(team.id))
                  }}
                  disabled={locked}
                  className={[
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center',
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:text-white',
                    locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <Flag code={team.code} size={32} />
                  <span className="text-sm font-medium leading-tight">{team.name}</span>
                  {isSelected && (
                    <span className="text-xs text-amber-400 font-medium">Selected ✓</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
            Teams TBD — picks will open once confirmed
          </div>
        )}

        {teamsKnown && (
          <button
            onClick={() => canToggleJoker && !locked && setIsJoker((v) => !v)}
            disabled={locked || (!canToggleJoker && !isJoker)}
            className={[
              'flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors w-full',
              isJoker
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-gray-200',
              locked || (!canToggleJoker && !isJoker)
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-base">🃏</span>
            <span>{isJoker ? 'Joker active (2× points)' : 'Use joker for this match'}</span>
          </button>
        )}
      </div>
    </Card>
  )
}
