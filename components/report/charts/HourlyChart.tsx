'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

export interface HourlyStat {
  hour:    number  // 0-23
  seconds: number
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分`
}

function timeLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}時`
}

interface Props {
  data: HourlyStat[]
}

export function HourlyChart({ data }: Props) {
  const hasData = data.some((d) => d.seconds > 0)

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  const maxSec  = Math.max(...data.map((d) => d.seconds))
  const peakHour = data.find((d) => d.seconds === maxSec)?.hour ?? -1

  const chartData = data.map((d) => ({
    label:   timeLabel(d.hour),
    rawSec:  d.seconds,
    hours:   d.seconds / 3600,
    isPeak:  d.hour === peakHour && d.seconds > 0,
  }))

  return (
    <div className="space-y-3">
      {/* ピーク時間帯バッジ */}
      {peakHour >= 0 && (
        <p className="text-xs text-gray-500">
          ピーク時間帯：
          <span className="ml-1 font-semibold text-blue-700">
            {timeLabel(peakHour)}〜{timeLabel(peakHour + 1)}
          </span>
          <span className="ml-2">（{formatDuration(maxSec)}）</span>
        </p>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={2}  // 3時間おきに表示
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v > 0 ? `${v.toFixed(0)}h` : ''}
          />
          <Tooltip
            formatter={(value: number) => [formatDuration(value * 3600), '作業時間']}
            labelFormatter={(label: string) => `${label}台`}
            labelStyle={{ color: '#111827', fontWeight: 600, fontSize: 12 }}
            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
          />
          <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={20}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isPeak ? '#1D4ED8' : entry.rawSec > 0 ? '#93C5FD' : '#F3F4F6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
