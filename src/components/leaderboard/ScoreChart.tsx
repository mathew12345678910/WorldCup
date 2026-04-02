'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { PlayerScore } from '@/types/database'

interface ScoreChartProps {
  score: PlayerScore
  playerName: string
}

const BAR_COLORS = {
  group_points: '#6366f1',
  knockout_points: '#f59e0b',
  special_points: '#10b981',
  novelty_points: '#ec4899',
}

export function ScoreChart({ score, playerName }: ScoreChartProps) {
  const data = [
    {
      category: 'Groups',
      points: score.group_points,
      fill: BAR_COLORS.group_points,
    },
    {
      category: 'Knockout',
      points: score.knockout_points,
      fill: BAR_COLORS.knockout_points,
    },
    {
      category: 'Specials',
      points: score.special_points,
      fill: BAR_COLORS.special_points,
    },
    {
      category: 'Novelty',
      points: score.novelty_points,
      fill: BAR_COLORS.novelty_points,
    },
  ]

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white truncate">{playerName}</p>
        <p className="text-sm font-bold text-amber-400">{score.total_points} pts</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="category"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.5rem',
              color: '#f9fafb',
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(value) => [`${value} pts`, 'Points']}
          />
          <Bar dataKey="points" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
