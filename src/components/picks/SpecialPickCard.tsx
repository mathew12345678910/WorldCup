'use client'

import { Card } from '@/components/ui/Card'
import { outrightPts, specialPts, applyJoker } from '@/lib/scoring'
import type { Team, SpecialPickType } from '@/types/database'

const SPECIAL_PICK_META: Record<
  SpecialPickType,
  { label: string; description: string; inputType: 'team' | 'player-name'; isOutright?: boolean }
> = {
  tournament_winner: {
    label: 'Tournament Winner',
    description: 'Which team will lift the trophy?',
    inputType: 'team',
    isOutright: true,
  },
  runner_up: {
    label: 'Runner-up',
    description: 'Which team will reach the final but fall short?',
    inputType: 'team',
    isOutright: true,
  },
  golden_boot: {
    label: 'Golden Boot',
    description: 'Top goalscorer of the tournament',
    inputType: 'player-name',
  },
  young_player: {
    label: 'Best Young Player',
    description: 'Best player under 21 in the tournament',
    inputType: 'player-name',
  },
  golden_glove: {
    label: 'Golden Glove',
    description: 'Best goalkeeper of the tournament',
    inputType: 'player-name',
  },
  group_stage_exit: {
    label: 'Biggest Group Stage Exit',
    description: 'Which top team will be eliminated in the group stage?',
    inputType: 'team',
  },
}

export type SpecialPicksState = Record<
  SpecialPickType,
  { teamId: string; playerName: string; isJoker: boolean }
>

export interface SpecialPickCardProps {
  teams: Team[]
  values: SpecialPicksState
  locked: boolean
  jokerUsedType: SpecialPickType | null
  onChange: (
    pickType: SpecialPickType,
    field: 'teamId' | 'playerName' | 'isJoker',
    value: string | boolean
  ) => void
  /** Map of teamId → decimal odds for the 'winner' market */
  teamOdds?: Map<number, number>
}

function SingleSpecialPick({
  pickType,
  teams,
  teamId,
  playerName,
  isJoker,
  locked,
  jokerUsed,
  onChange,
  teamOdds,
}: {
  pickType: SpecialPickType
  teams: Team[]
  teamId: string
  playerName: string
  isJoker: boolean
  locked: boolean
  jokerUsed: boolean
  onChange: (field: 'teamId' | 'playerName' | 'isJoker', value: string | boolean) => void
  teamOdds?: Map<number, number>
}) {
  const meta = SPECIAL_PICK_META[pickType]
  const canToggleJoker = !jokerUsed || isJoker

  // Calculate points if team is selected and we have odds
  let ptsDisplay: string | null = null
  if (meta.inputType === 'team' && teamId && teamOdds) {
    const odds = teamOdds.get(Number(teamId))
    if (odds) {
      const fn = meta.isOutright ? outrightPts : specialPts
      const basePts = fn(odds)
      const pts = applyJoker(basePts, isJoker)
      ptsDisplay = `${Math.round(pts * 10) / 10} pts`
    }
  }

  const selectClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-600'

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{meta.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
        </div>
        {ptsDisplay ? (
          <span className="text-xs font-semibold text-emerald-400 flex-shrink-0 tabular-nums">
            → {ptsDisplay}
          </span>
        ) : meta.inputType === 'team' ? (
          <span className="text-xs text-gray-500 flex-shrink-0">pts by odds</span>
        ) : (
          <span className="text-xs text-gray-500 flex-shrink-0">pts by odds</span>
        )}
      </div>

      {meta.inputType === 'team' ? (
        <select
          value={teamId}
          onChange={(e) => onChange('teamId', e.target.value)}
          disabled={locked}
          className={selectClass}
        >
          <option value="">— select team —</option>
          {teams.map((t) => {
            const odds = teamOdds?.get(t.id)
            return (
              <option key={t.id} value={String(t.id)}>
                {t.name}{odds ? ` (${odds.toFixed(1)})` : ''}
              </option>
            )
          })}
        </select>
      ) : (
        <input
          type="text"
          value={playerName}
          onChange={(e) => onChange('playerName', e.target.value.slice(0, 100))}
          disabled={locked}
          placeholder="Enter player name…"
          maxLength={100}
          className={inputClass}
        />
      )}

      <button
        onClick={() => {
          if (locked || (!canToggleJoker && !isJoker)) return
          onChange('isJoker', !isJoker)
        }}
        disabled={locked || (!canToggleJoker && !isJoker)}
        className={[
          'flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors w-full',
          isJoker
            ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
            : 'bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-gray-200',
          locked || (!canToggleJoker && !isJoker)
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="text-base">🃏</span>
        <span>{isJoker ? 'Joker active (1.5× points)' : 'Use joker for this pick'}</span>
      </button>
    </div>
  )
}

export function SpecialPickCard({ teams, values, locked, jokerUsedType, onChange, teamOdds }: SpecialPickCardProps) {
  const pickTypes = Object.keys(SPECIAL_PICK_META) as SpecialPickType[]
  const filledCount = pickTypes.filter((pt) => {
    const meta = SPECIAL_PICK_META[pt]
    const v = values[pt]
    return meta.inputType === 'team' ? !!v.teamId : !!v.playerName.trim()
  }).length

  // Calculate total potential points for filled team picks
  let totalPts = 0
  for (const pt of pickTypes) {
    const v = values[pt]
    const meta = SPECIAL_PICK_META[pt]
    if (meta.inputType === 'team' && v.teamId && teamOdds) {
      const odds = teamOdds.get(Number(v.teamId))
      if (odds) {
        const fn = meta.isOutright ? outrightPts : specialPts
        totalPts += applyJoker(fn(odds), v.isJoker)
      }
    }
  }

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Special <span className="text-blue-400 font-semibold">Picks</span>
          </span>
          <div className="flex items-center gap-3">
            {totalPts > 0 && (
              <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                ~{Math.round(totalPts)} pts
              </span>
            )}
            <span className="text-xs text-gray-500">
              {filledCount}/{pickTypes.length} filled
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {pickTypes.map((pt) => {
          const v = values[pt]
          const jokerUsedElsewhere = jokerUsedType !== null && jokerUsedType !== pt
          return (
            <SingleSpecialPick
              key={pt}
              pickType={pt}
              teams={teams}
              teamId={v.teamId}
              playerName={v.playerName}
              isJoker={v.isJoker}
              locked={locked}
              jokerUsed={jokerUsedElsewhere}
              onChange={(field, value) => onChange(pt, field, value)}
              teamOdds={teamOdds}
            />
          )
        })}
      </div>
    </Card>
  )
}
