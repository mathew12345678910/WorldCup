'use client'

import { Card } from '@/components/ui/Card'
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
}: {
  pickType: SpecialPickType
  teams: Team[]
  teamId: string
  playerName: string
  isJoker: boolean
  locked: boolean
  jokerUsed: boolean
  onChange: (field: 'teamId' | 'playerName' | 'isJoker', value: string | boolean) => void
}) {
  const meta = SPECIAL_PICK_META[pickType]
  const canToggleJoker = !jokerUsed || isJoker

  const selectClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-600'

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{meta.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">pts by odds</span>
      </div>

      {meta.inputType === 'team' ? (
        <select
          value={teamId}
          onChange={(e) => onChange('teamId', e.target.value)}
          disabled={locked}
          className={selectClass}
        >
          <option value="">— select team —</option>
          {teams.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
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
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
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

export function SpecialPickCard({ teams, values, locked, jokerUsedType, onChange }: SpecialPickCardProps) {
  const pickTypes = Object.keys(SPECIAL_PICK_META) as SpecialPickType[]
  const filledCount = pickTypes.filter((pt) => {
    const meta = SPECIAL_PICK_META[pt]
    const v = values[pt]
    return meta.inputType === 'team' ? !!v.teamId : !!v.playerName.trim()
  }).length

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Special <span className="text-amber-400 font-semibold">Picks</span>
          </span>
          <span className="text-xs text-gray-500">
            {filledCount}/{pickTypes.length} filled
          </span>
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
            />
          )
        })}
      </div>
    </Card>
  )
}
