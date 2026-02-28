'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export type Tab = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface DailyStat {
  date:    string  // YYYY-MM-DD
  seconds: number
}

interface BarItem {
  label:   string
  hours:   number
  rawSec:  number
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}時間${String(m).padStart(2, '0')}分`
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** 週次: Mon〜Sun 7本固定 */
function buildWeeklyData(data: DailyStat[], fromDateJST: string): BarItem[] {
  const secMap: Record<string, number> = {}
  for (const d of data) secMap[d.date] = d.seconds

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(fromDateJST, i)
    const sec  = secMap[date] ?? 0
    return { label: DOW_LABELS[i], hours: sec / 3600, rawSec: sec }
  })
}

/** 月次: 1日〜末日の固定本数 */
function buildMonthlyData(data: DailyStat[], fromDateJST: string): BarItem[] {
  const [y, m] = fromDateJST.split('-').map(Number)
  const numDays = daysInMonth(y, m)
  const secMap: Record<string, number> = {}
  for (const d of data) secMap[d.date] = d.seconds

  return Array.from({ length: numDays }, (_, i) => {
    const date = addDays(fromDateJST, i)
    const sec  = secMap[date] ?? 0
    return { label: `${i + 1}日`, hours: sec / 3600, rawSec: sec }
  })
}

/** 年次: 月別集計 12本固定 */
function buildYearlyData(data: DailyStat[], fromDateJST: string): BarItem[] {
  const year = parseInt(fromDateJST.slice(0, 4))
  const map  = new Map<string, number>()
  for (const d of data) {
    const ym = d.date.slice(0, 7)
    map.set(ym, (map.get(ym) ?? 0) + d.seconds)
  }
  return Array.from({ length: 12 }, (_, i) => {
    const ym  = `${year}-${String(i + 1).padStart(2, '0')}`
    const sec = map.get(ym) ?? 0
    return { label: `${i + 1}月`, hours: sec / 3600, rawSec: sec }
  })
}

interface Props {
  data:         DailyStat[]
  tab:          Tab
  fromDateJST:  string  // YYYY-MM-DD (JST)
}

export function TemporalBarChart({ data, tab, fromDateJST }: Props) {
  if (tab === 'daily') return null

  let chartData: BarItem[]
  switch (tab) {
    case 'weekly':  chartData = buildWeeklyData(data, fromDateJST);  break
    case 'monthly': chartData = buildMonthlyData(data, fromDateJST); break
    case 'yearly':  chartData = buildYearlyData(data, fromDateJST);  break
  }

  const isEmpty = chartData.every((d) => d.rawSec === 0)
  if (isEmpty) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          interval={tab === 'monthly' ? 4 : 0}  // 月次は5日刻みで表示
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v.toFixed(0)}h`}
        />
        <Tooltip
          formatter={(value: number) => [formatDuration(value * 3600), '作業時間']}
          labelStyle={{ color: '#111827', fontWeight: 600, fontSize: 12 }}
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
