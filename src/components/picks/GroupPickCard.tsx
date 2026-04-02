'use client'

import { Card } from '@/components/ui/Card'
import { groupPts, applyJoker } from '@/lib/scoring'
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
  /** Map of teamId → outright decimal odds (from useOdds) */
  teamOdds?: Map<number, number>
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
  teamOdds,
}: GroupPickCardProps) {
  const canToggleJoker = !jokerUsed || isJoker

  const selectClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed'

  // Calculate points for selected teams
  function getTeamPoints(teamId: string): { first: number; second: number } | null {
    if (!teamId) return null
    const odds = teamOdds?.get(Number(teamId))
    if (!odds) return null
    const basePts = groupPts(odds)
    const firstPts = applyJoker(basePts, isJoker)       // 100% if correct 1st
    const secondPts = applyJoker(basePts * 0.1, isJoker) // 10% if predicted 1st but came 2nd
    return { first: Math.round(firstPts * 10) / 10, second: Math.round(secondPts * 10) / 10 }
  }

  const firstPts = getTeamPoints(firstPlace)
  const secondPts = getTeamPoints(secondPlace)

  // Section total: best case (both correct)
  const sectionTotal = (firstPts?.first ?? 0) + (secondPts?.first ?? 0)

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Group <span className="text-amber-400 font-semibold">{groupLetter}</span>
          </span>
          {sectionTotal > 0 ? (
            <span className="text-xs font-semibold text-amber-400 tabular-nums">
              up to {Math.round(sectionTotal)} pts
            </span>
          ) : (firstPlace || secondPlace) ? (
            <span className="text-xs text-gray-500">pts vary by odds</span>
          ) : null}
        </div>
      }
    >
      <div className="space-y-3">
        {/* Teams list with odds */}
        <div className="flex flex-wrap gap-2 mb-3">
          {teams.map((team) => {
            const odds = teamOdds?.get(team.id)
            return (
              <span
                key={team.id}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-800/80 border border-gray-700/50 rounded-lg px-2.5 py-1 text-gray-300"
              >
                <span className="w-4 h-3 bg-gray-700 rounded-sm flex-shrink-0" />
                {team.name}
                {odds && (
                  <span className="text-gray-500 ml-0.5">({odds.toFixed(1)})</span>
                )}
              </span>
            )
          })}
        </div>

        {/* 1st place pick */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium">1st place</label>
            {firstPts && (
              <div className="flex gap-2 text-xs tabular-nums">
                <span className="text-emerald-400">If 1st: <strong>{firstPts.first}</strong> pts</span>
                <span className="text-gray-500">If 2nd: {firstPts.second} pts</span>
              </div>
            )}
          </div>
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

        {/* 2nd place pick */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium">2nd place</label>
            {secondPts && (
              <div className="flex gap-2 text-xs tabular-nums">
                <span className="text-emerald-400">If 2nd: <strong>{secondPts.first}</strong> pts</span>
                <span className="text-gray-500">If 1st: {secondPts.second} pts</span>
              </div>
            )}
          </div>
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
