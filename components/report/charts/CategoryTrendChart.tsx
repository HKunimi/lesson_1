'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { type CategoryStat } from './CategoryPieChart'

export type Tab = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CategoryDailyStat {
  date:        string  // YYYY-MM-DD
  category_id: string
  seconds:     number
}

// Tailwind 色名 → HEX
const COLOR_HEX: Record<string, string> = {
  'red-500':    '#EF4444', 'orange-500': '#F97316', 'amber-500':  '#F59E0B',
  'yellow-500': '#EAB308', 'lime-500':   '#84CC16', 'green-500':  '#22C55E',
  'teal-500':   '#14B8A6', 'cyan-500':   '#06B6D4', 'blue-500':   '#3B82F6',
  'indigo-500': '#6366F1', 'violet-500': '#8B5CF6', 'purple-500': '#A855F7',
  'pink-500':   '#EC4899', 'rose-500':   '#F43F5E',
}
function toHex(c: string) { return COLOR_HEX[c] ?? c }

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const mi = Math.floor((sec % 3600) / 60)
  return `${h}時間${String(mi).padStart(2, '0')}分`
}

/** 期間ラベルと日付キーのリストを生成 */
function buildPeriods(tab: Tab, fromDateJST: string): { key: string; label: string; isMonth: boolean }[] {
  const DOW = ['月', '火', '水', '木', '金', '土', '日']

  switch (tab) {
    case 'daily': return []
    case 'weekly':
      return Array.from({ length: 7 }, (_, i) => ({
        key:     addDays(fromDateJST, i),
        label:   DOW[i],
        isMonth: false,
      }))
    case 'monthly': {
      const [y, m] = fromDateJST.split('-').map(Number)
      return Array.from({ length: daysInMonth(y, m) }, (_, i) => ({
        key:     addDays(fromDateJST, i),
        label:   `${i + 1}日`,
        isMonth: false,
      }))
    }
    case 'yearly': {
      const year = parseInt(fromDateJST.slice(0, 4))
      return Array.from({ length: 12 }, (_, i) => ({
        key:     `${year}-${String(i + 1).padStart(2, '0')}`,
        label:   `${i + 1}月`,
        isMonth: true,
      }))
    }
  }
}

interface Props {
  categories:            CategoryStat[]
  categoryDailyBreakdown: CategoryDailyStat[]
  tab:                   Tab
  fromDateJST:           string
}

export function CategoryTrendChart({ categories, categoryDailyBreakdown, tab, fromDateJST }: Props) {
  if (tab === 'daily' || categories.length === 0) return null

  const periods = buildPeriods(tab, fromDateJST)

  // Recharts 用データ: [{ label, catId1: hours, catId2: hours, ... }, ...]
  const chartData = periods.map(({ key, label, isMonth }) => {
    const row: Record<string, string | number> = { label }
    for (const cat of categories) {
      const sec = categoryDailyBreakdown
        .filter((d) => (isMonth ? d.date.startsWith(key) : d.date === key))
        .filter((d) => d.category_id === cat.id)
        .reduce((s, d) => s + d.seconds, 0)
      row[cat.id] = sec / 3600
    }
    return row
  })

  const hasData = chartData.some((row) =>
    categories.some((cat) => (row[cat.id] as number) > 0)
  )

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          interval={tab === 'monthly' ? 4 : 0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v.toFixed(0)}h`}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            const cat = categories.find((c) => c.id === name)
            return [formatDuration(value * 3600), cat?.name ?? name]
          }}
          labelStyle={{ color: '#111827', fontWeight: 600, fontSize: 12 }}
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        <Legend
          formatter={(value: string) => categories.find((c) => c.id === value)?.name ?? value}
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={10}
        />
        {categories.map((cat) => (
          <Bar
            key={cat.id}
            dataKey={cat.id}
            stackId="a"
            fill={toHex(cat.color)}
            radius={categories.indexOf(cat) === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
