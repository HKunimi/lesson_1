'use client'

import { Timer, CalendarDays, Activity } from 'lucide-react'
import { HourlyChart, type HourlyStat }              from './charts/HourlyChart'
import { CategoryTrendChart, type CategoryDailyStat, type Tab } from './charts/CategoryTrendChart'
import { type CategoryStat }                          from './charts/CategoryPieChart'

interface PeriodStats {
  total_seconds: number
  entry_count:   number
  active_days:   number
}

interface Props {
  current:                  PeriodStats
  categories:               CategoryStat[]
  hourlyBreakdown:          HourlyStat[]
  categoryDailyBreakdown:   CategoryDailyStat[]
  dailyBreakdown:           { date: string; seconds: number }[]
  tab:                      Tab
  fromDateJST:              string
}

// ── ユーティリティ ─────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  if (sec <= 0) return '---'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}時間${String(m).padStart(2, '0')}分`
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

/** daily_breakdown から「最もアクティブな曜日」を求める */
function getMostActiveDow(daily: { date: string; seconds: number }[]): { label: string; avgSec: number } | null {
  const sumByDow   = Array(7).fill(0)
  const countByDow = Array(7).fill(0)

  for (const { date, seconds } of daily) {
    const dow = new Date(date + 'T12:00:00Z').getUTCDay()
    const idx = dow === 0 ? 6 : dow - 1
    sumByDow[idx]   += seconds
    countByDow[idx] += 1
  }

  const maxSec = Math.max(...sumByDow)
  if (maxSec === 0) return null

  const idx    = sumByDow.indexOf(maxSec)
  const count  = countByDow[idx]
  const avgSec = count > 0 ? Math.floor(sumByDow[idx] / count) : 0
  return { label: DOW_LABELS[idx], avgSec }
}

/** hourly_breakdown からピーク時間帯（連続2時間の最大値）を求める */
function getPeakTimeSlot(hourly: HourlyStat[]): { label: string; seconds: number } | null {
  let maxSec  = 0
  let maxHour = -1
  for (const { hour, seconds } of hourly) {
    if (seconds > maxSec) { maxSec = seconds; maxHour = hour }
  }
  if (maxHour < 0 || maxSec === 0) return null
  return {
    label:   `${String(maxHour).padStart(2, '0')}:00〜${String(maxHour + 1).padStart(2, '0')}:00`,
    seconds: maxSec,
  }
}

// ── メインコンポーネント ────────────────────────────────────────────────────────

export function ProductivitySection({
  current,
  categories,
  hourlyBreakdown,
  categoryDailyBreakdown,
  dailyBreakdown,
  tab,
  fromDateJST,
}: Props) {
  const avgSession  = current.entry_count > 0
    ? Math.floor(current.total_seconds / current.entry_count)
    : 0

  const mostActiveDow = getMostActiveDow(dailyBreakdown)
  const peakSlot      = getPeakTimeSlot(hourlyBreakdown)

  return (
    <div className="space-y-6">

      {/* ── 生産性サマリーカード ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* 平均セッション時間 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Timer className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">平均セッション時間</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(avgSession)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {current.entry_count > 0 ? `${current.entry_count}セッションの平均` : '記録がありません'}
          </p>
        </div>

        {/* 最もアクティブな曜日 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">最もアクティブな曜日</span>
          </div>
          {mostActiveDow ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{mostActiveDow.label}曜日</p>
              <p className="mt-1 text-xs text-gray-500">
                平均 {formatDuration(mostActiveDow.avgSec)} / 日
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-500">---</p>
              <p className="mt-1 text-xs text-gray-500">記録がありません</p>
            </>
          )}
        </div>

        {/* ピーク時間帯 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">ピーク作業時間帯</span>
          </div>
          {peakSlot ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{peakSlot.label}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDuration(peakSlot.seconds)}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-500">---</p>
              <p className="mt-1 text-xs text-gray-500">記録がありません</p>
            </>
          )}
        </div>
      </div>

      {/* ── 最も集中した時間帯チャート ── */}
      <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
        <p className="mb-4 text-sm font-semibold text-gray-700">時間帯別作業分布</p>
        <HourlyChart data={hourlyBreakdown} />
      </div>

      {/* ── カテゴリごとの推移 ── */}
      {tab !== 'daily' && categories.length > 0 && (
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
          <p className="mb-4 text-sm font-semibold text-gray-700">カテゴリごとの推移</p>
          <CategoryTrendChart
            categories={categories}
            categoryDailyBreakdown={categoryDailyBreakdown}
            tab={tab}
            fromDateJST={fromDateJST}
          />
        </div>
      )}

    </div>
  )
}
