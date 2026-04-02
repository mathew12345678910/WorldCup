'use client'

import { Card } from '@/components/ui/Card'
import { NOVELTY_PTS } from '@/lib/scoring'
import type { NoveltyPickType } from '@/types/database'

interface NoveltyQuestion {
  label: string
  description: string
  inputType: 'text' | 'select'
  options?: string[]
}

const NOVELTY_META: Record<NoveltyPickType, NoveltyQuestion> = {
  host_performance: {
    label: 'Host Nation Performance',
    description: 'How far will the host nation (USA/Canada/Mexico) go?',
    inputType: 'select',
    options: [
      'Group stage',
      'Round of 32',
      'Round of 16',
      'Quarter-final',
      'Semi-final',
      'Final',
      'Champions',
    ],
  },
  final_penalty: {
    label: 'Final Goes to Penalties',
    description: 'Will the final be decided by a penalty shootout?',
    inputType: 'select',
    options: ['Yes', 'No'],
  },
  most_cards: {
    label: 'Most Cards',
    description: 'Which team will receive the most yellow/red cards?',
    inputType: 'text',
  },
  biggest_upset: {
    label: 'Biggest Upset',
    description: 'Which match result will be the biggest upset of the tournament?',
    inputType: 'text',
  },
  first_goal: {
    label: 'First Goal',
    description: 'Who will score the first goal of the tournament?',
    inputType: 'text',
  },
  hat_trick: {
    label: 'Hat-trick Hero',
    description: 'Which player will score a hat-trick?',
    inputType: 'text',
  },
  own_goal: {
    label: 'Own Goal Scorer',
    description: 'Which player will score an own goal in the tournament?',
    inputType: 'text',
  },
}

export type NoveltyPicksState = Record<NoveltyPickType, string>

export interface NoveltyPickCardProps {
  values: NoveltyPicksState
  locked: boolean
  onChange: (pickType: NoveltyPickType, value: string) => void
}

export function NoveltyPickCard({ values, locked, onChange }: NoveltyPickCardProps) {
  const pickTypes = Object.keys(NOVELTY_META) as NoveltyPickType[]
  const filledCount = pickTypes.filter((pt) => !!values[pt].trim()).length

  const baseInputClass =
    'w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <Card
      glass
      header={
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white">
            Novelty <span className="text-amber-400 font-semibold">Picks</span>
          </span>
          <span className="text-xs text-gray-500">
            {filledCount}/{pickTypes.length} answered
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        {pickTypes.map((pt) => {
          const meta = NOVELTY_META[pt]
          const pts = NOVELTY_PTS[pt] ?? 0
          const value = values[pt]

          return (
            <div key={pt} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
                </div>
                <span className="text-xs font-semibold text-amber-400 flex-shrink-0 tabular-nums">
                  {pts} pts
                </span>
              </div>

              {meta.inputType === 'select' && meta.options ? (
                <select
                  value={value}
                  onChange={(e) => onChange(pt, e.target.value)}
                  disabled={locked}
                  className={baseInputClass}
                >
                  <option value="">— select answer —</option>
                  {meta.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(pt, e.target.value.slice(0, 255))}
                  disabled={locked}
                  placeholder=""
                  maxLength={255}
                  className={`${baseInputClass} placeholder-gray-600`}
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
