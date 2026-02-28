'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export interface CategoryStat {
  id:      string
  name:    string
  color:   string  // Tailwind color name (e.g. "blue-500")
  seconds: number
}

// Tailwind 色名 → HEX マッピング
const COLOR_HEX: Record<string, string> = {
  'red-500':    '#EF4444',
  'orange-500': '#F97316',
  'amber-500':  '#F59E0B',
  'yellow-500': '#EAB308',
  'lime-500':   '#84CC16',
  'green-500':  '#22C55E',
  'teal-500':   '#14B8A6',
  'cyan-500':   '#06B6D4',
  'blue-500':   '#3B82F6',
  'indigo-500': '#6366F1',
  'violet-500': '#8B5CF6',
  'purple-500': '#A855F7',
  'pink-500':   '#EC4899',
  'rose-500':   '#F43F5E',
}

function toHex(color: string): string {
  return COLOR_HEX[color] ?? color
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}時間${String(m).padStart(2, '0')}分`
}

interface Props {
  data: CategoryStat[]
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.seconds, 0)
  const chartData = data.map((d) => ({
    name:  d.name,
    value: d.seconds,
    hex:   toHex(d.color),
    pct:   total > 0 ? Math.round((d.seconds / total) * 100) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.hex} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [formatDuration(value), name]}
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value: string, entry: unknown) => {
            const e = entry as { payload?: { pct?: number } }
            return `${value} (${e.payload?.pct ?? 0}%)`
          }}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
