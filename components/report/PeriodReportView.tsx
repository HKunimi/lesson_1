'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { CategoryPieChart, type CategoryStat }               from './charts/CategoryPieChart'
import { TemporalBarChart, type DailyStat }                  from './charts/TemporalBarChart'
import { WorkHeatmap }                                        from './charts/WorkHeatmap'
import { ProductivitySection }                               from './ProductivitySection'
import { type HourlyStat }                                   from './charts/HourlyChart'
import { type CategoryDailyStat }                            from './charts/CategoryTrendChart'
import { PDFDownloadButton }                                 from './PDFDownloadButton'
import { InsightsSummary }                                  from './InsightsSummary'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab           = 'daily' | 'weekly' | 'monthly' | 'yearly'
type DailyPreset   = 'today' | 'yesterday' | 'custom'
type WeeklyPreset  = 'this_week' | 'last_week'
type MonthlyPreset = 'this_month' | 'last_month' | 'custom'
type YearlyPreset  = 'this_year' | 'last_year'

interface PeriodRange {
  from:         string  // UTC ISO, inclusive
  to:           string  // UTC ISO, exclusive
  prevFrom:     string
  prevTo:       string
  label:        string
  daysInPeriod: number
  fromDateJST:  string  // YYYY-MM-DD (グラフ起点日)
}

interface PeriodStats {
  total_seconds: number
  entry_count:   number
  active_days:   number
}

interface StatsData {
  current:                  PeriodStats
  previous:                 PeriodStats
  category_breakdown:       CategoryStat[]
  daily_breakdown:          DailyStat[]
  hourly_breakdown:         HourlyStat[]
  category_daily_breakdown: CategoryDailyStat[]
}

// ── JST 日付ユーティリティ ─────────────────────────────────────────────────────

const JST_OFFSET = 9 * 60 * 60 * 1000

function todayJST(): string {
  return new Date(Date.now() + JST_OFFSET).toISOString().slice(0, 10)
}

function jstToUTC(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - JST_OFFSET).toISOString()
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function startOfWeekJST(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow  = date.getUTCDay()
  const back = dow === 0 ? 6 : dow - 1
  return new Date(date.getTime() - back * 86400000).toISOString().slice(0, 10)
}

function startOfMonthJST(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01'
}

function startOfNextMonthJST(ms: string): string {
  const [y, m] = ms.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

function startOfPrevMonthJST(ms: string): string {
  return startOfMonthJST(addDays(ms, -1))
}

function daysInMonthJST(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function daysInYearJST(y: number): number {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365
}

function fmtDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

function fmtMonthJP(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}年${m}月`
}

// ── 期間範囲計算 ───────────────────────────────────────────────────────────────

function getDailyRange(preset: DailyPreset, customDate: string): PeriodRange {
  const today = todayJST()
  let date: string, label: string

  if (preset === 'today') {
    date = today; label = `${fmtDateJP(today)}（今日）`
  } else if (preset === 'yesterday') {
    date = addDays(today, -1); label = `${fmtDateJP(date)}（昨日）`
  } else {
    date = customDate || today; label = fmtDateJP(date)
  }

  return {
    from:         jstToUTC(date),
    to:           jstToUTC(addDays(date, 1)),
    prevFrom:     jstToUTC(addDays(date, -1)),
    prevTo:       jstToUTC(date),
    label,
    daysInPeriod: 1,
    fromDateJST:  date,
  }
}

function getWeeklyRange(preset: WeeklyPreset): PeriodRange {
  const today         = todayJST()
  const thisWeekStart = startOfWeekJST(today)
  const weekStart     = preset === 'this_week' ? thisWeekStart : addDays(thisWeekStart, -7)
  const suffix        = preset === 'this_week' ? '（今週）' : '（先週）'

  return {
    from:         jstToUTC(weekStart),
    to:           jstToUTC(addDays(weekStart, 7)),
    prevFrom:     jstToUTC(addDays(weekStart, -7)),
    prevTo:       jstToUTC(weekStart),
    label:        `${fmtDateJP(weekStart)} 〜 ${fmtDateJP(addDays(weekStart, 6))}${suffix}`,
    daysInPeriod: 7,
    fromDateJST:  weekStart,
  }
}

function getMonthlyRange(preset: MonthlyPreset, customMonth: string): PeriodRange {
  const today = todayJST()
  let monthStart: string, label: string

  if (preset === 'this_month') {
    monthStart = startOfMonthJST(today); label = `${fmtMonthJP(today.slice(0, 7))}（今月）`
  } else if (preset === 'last_month') {
    monthStart = startOfPrevMonthJST(startOfMonthJST(today))
    label = `${fmtMonthJP(monthStart.slice(0, 7))}（先月）`
  } else {
    monthStart = (customMonth || today.slice(0, 7)) + '-01'
    label      = fmtMonthJP(monthStart.slice(0, 7))
  }

  return {
    from:         jstToUTC(monthStart),
    to:           jstToUTC(startOfNextMonthJST(monthStart)),
    prevFrom:     jstToUTC(startOfPrevMonthJST(monthStart)),
    prevTo:       jstToUTC(monthStart),
    label,
    daysInPeriod: daysInMonthJST(monthStart.slice(0, 7)),
    fromDateJST:  monthStart,
  }
}

function getYearlyRange(preset: YearlyPreset): PeriodRange {
  const thisYear = parseInt(todayJST().slice(0, 4))
  const year     = preset === 'this_year' ? thisYear : thisYear - 1
  const suffix   = preset === 'this_year' ? '（今年）' : '（去年）'

  return {
    from:         jstToUTC(`${year}-01-01`),
    to:           jstToUTC(`${year + 1}-01-01`),
    prevFrom:     jstToUTC(`${year - 1}-01-01`),
    prevTo:       jstToUTC(`${year}-01-01`),
    label:        `${year}年${suffix}`,
    daysInPeriod: daysInYearJST(year),
    fromDateJST:  `${year}-01-01`,
  }
}

// ── 表示ユーティリティ ─────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}時間${String(m).padStart(2, '0')}分`
}

interface ChangeInfo {
  percent:  string
  diff:     string
  positive: boolean | null
}

function computeChange(current: number, previous: number): ChangeInfo {
  if (previous === 0) return { percent: '---', diff: '前期間データなし', positive: null }
  const pct      = ((current - previous) / previous) * 100
  const diffSec  = current - previous
  const abs      = Math.abs(diffSec)
  const sign     = diffSec >= 0 ? '+' : '-'
  const h        = Math.floor(abs / 3600)
  const m        = Math.floor((abs % 3600) / 60)
  const absStr   = h > 0 ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分`
  return {
    percent:  `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    diff:     `${sign}${absStr}（${diffSec >= 0 ? '増加' : '減少'}）`,
    positive: diffSec > 0 ? true : diffSec < 0 ? false : null,
  }
}

// ── タブバー設定 ───────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'daily',   label: '日次' },
  { key: 'weekly',  label: '週次' },
  { key: 'monthly', label: '月次' },
  { key: 'yearly',  label: '年次' },
]

// ── スケルトン ─────────────────────────────────────────────────────────────────
function Skeleton({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} style={style} />
}

// ── メインコンポーネント ────────────────────────────────────────────────────────

export function PeriodReportView() {
  const [tab,           setTab]           = useState<Tab>('daily')
  const [dailyPreset,   setDailyPreset]   = useState<DailyPreset>('today')
  const [weeklyPreset,  setWeeklyPreset]  = useState<WeeklyPreset>('this_week')
  const [monthlyPreset, setMonthlyPreset] = useState<MonthlyPreset>('this_month')
  const [yearlyPreset,  setYearlyPreset]  = useState<YearlyPreset>('this_year')
  const [customDaily,   setCustomDaily]   = useState(todayJST)
  const [customMonthly, setCustomMonthly] = useState(() => todayJST().slice(0, 7))
  const [stats,         setStats]         = useState<StatsData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  const range = useMemo<PeriodRange>(() => {
    switch (tab) {
      case 'daily':   return getDailyRange(dailyPreset, customDaily)
      case 'weekly':  return getWeeklyRange(weeklyPreset)
      case 'monthly': return getMonthlyRange(monthlyPreset, customMonthly)
      case 'yearly':  return getYearlyRange(yearlyPreset)
    }
  }, [tab, dailyPreset, weeklyPreset, monthlyPreset, yearlyPreset, customDaily, customMonthly])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const p = new URLSearchParams({
      from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo,
    })
    fetch(`/api/report/stats?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error.message); setStats(d) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [range])

  const change   = stats ? computeChange(stats.current.total_seconds, stats.previous.total_seconds) : null
  const dailyAvg = stats && stats.current.active_days > 0
    ? Math.floor(stats.current.total_seconds / stats.current.active_days) : 0

  return (
    <div className="space-y-6">

      {/* ── タブバー ── */}
      <div className="flex rounded-xl border border-gray-300 bg-white p-1 shadow-sm">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === key
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 期間セレクター ── */}
      <div className="flex flex-wrap items-center gap-2">
        {tab === 'daily' && (
          <>
            {(['today', 'yesterday', 'custom'] as DailyPreset[]).map((p) => (
              <button key={p} onClick={() => setDailyPreset(p)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  dailyPreset === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {p === 'today' ? '今日' : p === 'yesterday' ? '昨日' : 'カスタム'}
              </button>
            ))}
            {dailyPreset === 'custom' && (
              <input type="date" value={customDaily} max={todayJST()}
                onChange={(e) => setCustomDaily(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
            )}
          </>
        )}

        {tab === 'weekly' && (
          <>
            {(['this_week', 'last_week'] as WeeklyPreset[]).map((p) => (
              <button key={p} onClick={() => setWeeklyPreset(p)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  weeklyPreset === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {p === 'this_week' ? '今週' : '先週'}
              </button>
            ))}
          </>
        )}

        {tab === 'monthly' && (
          <>
            {(['this_month', 'last_month', 'custom'] as MonthlyPreset[]).map((p) => (
              <button key={p} onClick={() => setMonthlyPreset(p)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  monthlyPreset === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {p === 'this_month' ? '今月' : p === 'last_month' ? '先月' : 'カスタム'}
              </button>
            ))}
            {monthlyPreset === 'custom' && (
              <input type="month" value={customMonthly} max={todayJST().slice(0, 7)}
                onChange={(e) => setCustomMonthly(e.target.value)}
                className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
            )}
          </>
        )}

        {tab === 'yearly' && (
          <>
            {(['this_year', 'last_year'] as YearlyPreset[]).map((p) => (
              <button key={p} onClick={() => setYearlyPreset(p)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  yearlyPreset === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {p === 'this_year' ? '今年' : '去年'}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── 期間ラベル + PDFボタン ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{range.label}</p>
        {!loading && stats && (
          <PDFDownloadButton
            targetId="report-content"
            filename={`project-tracker-report-${range.fromDateJST}`}
          />
        )}
      </div>

      {/* ── エラー ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* ── レポート本体（PDF対象） ── */}
      <div id="report-content" className="space-y-6 bg-white">

      {/* ── PDF用ヘッダー（画面には非表示） ── */}
      <div className="hidden-for-screen border-b border-gray-200 pb-4 print:block" style={{ display: 'none' }}>
        <p className="text-lg font-bold text-gray-900">作業時間 分析レポート</p>
        <p className="text-sm text-gray-600">{range.label}</p>
      </div>

      {/* ── サマリーカード ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 作業時間合計 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">作業時間合計</span>
          </div>
          {loading ? <><Skeleton className="mb-2 h-7 w-32" /><Skeleton className="h-3 w-20" /></> : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(stats?.current.total_seconds ?? 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {(stats?.current.entry_count ?? 0) > 0
                  ? `${stats!.current.entry_count}件 / ${stats!.current.active_days}日`
                  : '記録がありません'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                前期間: {formatDuration(stats?.previous.total_seconds ?? 0)}
              </p>
            </>
          )}
        </div>

        {/* 前期間比較 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
              change?.positive === true  ? 'bg-green-500'
              : change?.positive === false ? 'bg-red-500' : 'bg-gray-400'
            }`}>
              {change?.positive === true  ? <TrendingUp   className="h-4 w-4 text-white" />
              : change?.positive === false ? <TrendingDown className="h-4 w-4 text-white" />
              : <Minus className="h-4 w-4 text-white" />}
            </div>
            <span className="text-sm font-semibold text-gray-700">前期間比較</span>
          </div>
          {loading ? <><Skeleton className="mb-2 h-7 w-24" /><Skeleton className="h-3 w-28" /></> : (
            <>
              <p className={`text-2xl font-bold ${
                change?.positive === true  ? 'text-green-600'
                : change?.positive === false ? 'text-red-600' : 'text-gray-500'
              }`}>
                {change?.percent ?? '---'}
              </p>
              <p className="mt-1 text-xs text-gray-500">{change?.diff ?? ''}</p>
            </>
          )}
        </div>

        {/* 1日平均 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">1日平均</span>
          </div>
          {loading ? <><Skeleton className="mb-2 h-7 w-32" /><Skeleton className="h-3 w-24" /></> : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {(stats?.current.active_days ?? 0) > 0 ? formatDuration(dailyAvg) : '---'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                アクティブ {stats?.current.active_days ?? 0}日 / 全{range.daysInPeriod}日
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── グラフ ── */}
      {!loading && stats && (
        <>
          {/* 円グラフ: カテゴリ別時間配分 */}
          <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
            <p className="mb-4 text-sm font-semibold text-gray-700">カテゴリ別時間配分</p>
            <CategoryPieChart data={stats.category_breakdown} />
          </div>

          {/* 棒グラフ: 期間別作業時間（日次以外） */}
          {tab !== 'daily' && (
            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
              <p className="mb-4 text-sm font-semibold text-gray-700">
                {tab === 'yearly' ? '月別作業時間' : '日別作業時間'}
              </p>
              <TemporalBarChart
                data={stats.daily_breakdown}
                tab={tab}
                fromDateJST={range.fromDateJST}
              />
            </div>
          )}

          {/* ヒートマップ: 作業密度（日次以外） */}
          {tab !== 'daily' && (
            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
              <p className="mb-4 text-sm font-semibold text-gray-700">作業密度カレンダー</p>
              <WorkHeatmap
                data={stats.daily_breakdown}
                fromDateJST={range.fromDateJST}
                tab={tab}
              />
            </div>
          )}

          {/* AI 生産性サマリー */}
          <InsightsSummary
            tab={tab}
            label={range.label}
            daysInPeriod={range.daysInPeriod}
            current={stats.current}
            previous={stats.previous}
            category_breakdown={stats.category_breakdown}
            hourly_breakdown={stats.hourly_breakdown}
          />

          {/* 生産性指標 */}
          <div className="border-t border-gray-200 pt-6">
            <p className="mb-6 text-lg font-bold text-gray-900">生産性指標</p>
            <ProductivitySection
              current={stats.current}
              categories={stats.category_breakdown}
              hourlyBreakdown={stats.hourly_breakdown}
              categoryDailyBreakdown={stats.category_daily_breakdown}
              dailyBreakdown={stats.daily_breakdown}
              tab={tab}
              fromDateJST={range.fromDateJST}
            />
          </div>
        </>
      )}

      </div>{/* end #report-content */}

      {/* ローディング時グラフプレースホルダー */}
      {loading && (
        <div className="space-y-4">
          {[300, 240, 200].map((h, i) => (
            <div key={i} className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
              <Skeleton className="mb-4 h-4 w-32" />
              <Skeleton className={`w-full`} style={{ height: h } as React.CSSProperties} />
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
