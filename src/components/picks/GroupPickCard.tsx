'use client'

import { Card } from '@/components/ui/Card'
import type { Team } from '@/types/database'

export interface GroupPickCardProps {
  groupLetter: string
  teams: Team[]
  firstPlace: string  // team id as string or ''
  secondPlace: string
  isJoker: boolean
  locked: boolean
  onChange: (firstPlace: string, secondPlace: string, isJoker: boolean) => void
  jokerUsed: boolean
  potentialPoints?: number
}

export function GroupPickCard({
  groupLetter,
  teams,
  firstPlace,
  secondPlace,
  isJoker,
  locked,
  onChange,
  jokerUsed,
  potentialPoints,
}: GroupPickCardProps) {
  const canToggleJoker = !jokerUsed || isJoker

  const selectClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed'

  const ptsDisplay =
    potentialPoints !== undefined && potentialPoints > 0 ? (
      <span className="text-xs font-semibold text-amber-400 tabular-nums">
        ~{Math.round(potentialPoints)} pts
      </span>
    ) : (firstPlace || secondPlace) ? (
      <span className="text-xs text-gray-500">pts vary by odds</span>
    ) : null

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Group <span className="text-amber-400 font-semibold">{groupLetter}</span>
          </span>
          {ptsDisplay}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                const val = e.target.value
                onChange(val, val === secondPlace ? '' : secondPlace, isJoker)
              }}
              disabled={locked}
              className={selectClass}
            >
              <option value="">— pick team —</option>
              {teams.map((t) => (
                <option key={t.id} value={String(t.id)} disabled={String(t.id) === secondPlace}>
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
                const val = e.target.value
                onChange(val === firstPlace ? '' : firstPlace, val, isJoker)
              }}
              disabled={locked}
              className={selectClass}
            >
              <option value="">— pick team —</option>
              {teams.map((t) => (
                <option key={t.id} value={String(t.id)} disabled={String(t.id) === firstPlace}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Joker toggle */}
        <button
          onClick={() => {
            if (locked || (!canToggleJoker && !isJoker)) return
            onChange(firstPlace, secondPlace, !isJoker)
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
          <span>{isJoker ? 'Joker active (1.5× points)' : 'Use joker for this group'}</span>
        </button>
      </div>
    </Card>
  )
}
