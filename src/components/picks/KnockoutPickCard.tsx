'use client'

import { Card } from '@/components/ui/Card'
import Flag from '@/components/ui/Flag'
import type { Match, Team, MatchStage } from '@/types/database'

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
  selectedTeamId: string
  isJoker: boolean
  locked: boolean
  onChange: (matchId: number, teamId: string, isJoker: boolean) => void
  jokerUsedInRound: boolean
}

export function KnockoutPickCard({
  match,
  homeTeam,
  awayTeam,
  selectedTeamId,
  isJoker,
  locked,
  onChange,
  jokerUsedInRound,
}: KnockoutPickCardProps) {
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
          <span className="text-xs text-gray-500">{kickoffStr} UTC</span>
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
                    onChange(match.id, isSelected ? '' : String(team.id), isJoker)
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
            onClick={() => {
              if (!canToggleJoker || locked) return
              onChange(match.id, selectedTeamId, !isJoker)
            }}
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
