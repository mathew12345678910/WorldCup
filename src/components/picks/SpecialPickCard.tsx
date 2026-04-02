'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { SaveStatus, SaveState } from '@/components/ui/SaveStatus'
import type { Team, SpecialPick, SpecialPickType } from '@/types/database'

const SPECIAL_PICK_META: Record<
  SpecialPickType,
  { label: string; description: string; inputType: 'team' | 'player-name' }
> = {
  tournament_winner: {
    label: 'Tournament Winner',
    description: 'Which team will lift the trophy?',
    inputType: 'team',
  },
  runner_up: {
    label: 'Runner-up',
    description: 'Which team will reach the final but fall short?',
    inputType: 'team',
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

interface SpecialPickCardProps {
  playerId: string
  teams: Team[]
  existingPicks: SpecialPick[]
  locked: boolean
  onSave: (
    pickType: SpecialPickType,
    teamId: number | null,
    playerName: string | null,
    isJoker: boolean
  ) => Promise<void>
}

function SingleSpecialPick({
  pickType,
  teams,
  existing,
  locked,
  onSave,
}: {
  pickType: SpecialPickType
  teams: Team[]
  existing: SpecialPick | undefined
  locked: boolean
  onSave: (teamId: number | null, playerName: string | null, isJoker: boolean) => Promise<void>
}) {
  const meta = SPECIAL_PICK_META[pickType]
  const [teamId, setTeamId] = useState<string>(existing?.team_id ? String(existing.team_id) : '')
  const [playerName, setPlayerName] = useState(existing?.player_name ?? '')
  const [isJoker, setIsJoker] = useState(existing?.is_joker ?? false)
  const [saveState, setSaveState] = useState<SaveState>(locked ? 'locked' : 'idle')

  const isDirty =
    (meta.inputType === 'team'
      ? teamId !== (existing?.team_id ? String(existing.team_id) : '')
      : playerName !== (existing?.player_name ?? '')) ||
    isJoker !== (existing?.is_joker ?? false)

  const handleSave = useCallback(async () => {
    if (locked) return
    setSaveState('saving')
    try {
      await onSave(
        meta.inputType === 'team' && teamId ? Number(teamId) : null,
        meta.inputType === 'player-name' && playerName.trim() ? playerName.trim() : null,
        isJoker
      )
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }, [locked, meta.inputType, teamId, playerName, isJoker, onSave])

  useEffect(() => {
    if (!isDirty || locked) return
    const timer = setTimeout(handleSave, 800)
    return () => clearTimeout(timer)
  }, [teamId, playerName, isJoker, isDirty, locked, handleSave])

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
        <SaveStatus state={saveState} />
      </div>

      {meta.inputType === 'team' ? (
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          disabled={locked}
          className={selectClass}
        >
          <option value="">— select team —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 100))}
          disabled={locked}
          placeholder=""
          maxLength={100}
          className={inputClass}
        />
      )}

      <button
        onClick={() => !locked && setIsJoker((v) => !v)}
        disabled={locked}
        className={[
          'flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors w-full',
          isJoker
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            : 'bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-gray-200',
          locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="text-base">🃏</span>
        <span>{isJoker ? 'Joker active (2× points)' : 'Use joker for this pick'}</span>
      </button>
    </div>
  )
}

export function SpecialPickCard({
  teams,
  existingPicks,
  locked,
  onSave,
}: SpecialPickCardProps) {
  const pickTypes = Object.keys(SPECIAL_PICK_META) as SpecialPickType[]

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Special <span className="text-amber-400 font-semibold">Picks</span>
          </span>
          <span className="text-xs text-gray-500">{pickTypes.length} picks</span>
        </div>
      }
    >
      <div className="space-y-3">
        {pickTypes.map((pt) => (
          <SingleSpecialPick
            key={pt}
            pickType={pt}
            teams={teams}
            existing={existingPicks.find((p) => p.pick_type === pt)}
            locked={locked}
            onSave={(teamId, playerName, isJoker) =>
              onSave(pt, teamId, playerName, isJoker)
            }
          />
        ))}
      </div>
    </Card>
  )
}
