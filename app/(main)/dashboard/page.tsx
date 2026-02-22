import { Clock, Calendar, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import TimerSection from '@/components/TimerSection'
import ManualEntryModal from '@/components/ManualEntryModal'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { TimeEntry } from '@/types'

// =============================================
// 日付ユーティリティ（Asia/Tokyo = UTC+9）
// =============================================
const JST_OFFSET = 9 * 60 * 60 * 1000

function startOfDayJST(date: Date = new Date()): Date {
  const jst = new Date(date.getTime() + JST_OFFSET)
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - JST_OFFSET
  )
}

function startOfWeekJST(date: Date = new Date()): Date {
  const startDay = startOfDayJST(date)
  const jst = new Date(date.getTime() + JST_OFFSET)
  const dow = jst.getUTCDay() // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  return new Date(startDay.getTime() - daysFromMonday * 86400_000)
}

function startOfMonthJST(date: Date = new Date()): Date {
  const jst = new Date(date.getTime() + JST_OFFSET)
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}時間${String(m).padStart(2, '0')}分`
}

function formatEntryDate(isoString: string): string {
  const jst = new Date(new Date(isoString).getTime() + JST_OFFSET)
  const month = jst.getUTCMonth() + 1
  const day = jst.getUTCDate()
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const m = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${month}/${day} ${h}:${m}`
}

const COLOR_BG: Record<string, string> = {
  'red-500': 'bg-red-500',
  'orange-500': 'bg-orange-500',
  'amber-500': 'bg-amber-500',
  'yellow-500': 'bg-yellow-500',
  'lime-500': 'bg-lime-500',
  'green-500': 'bg-green-500',
  'teal-500': 'bg-teal-500',
  'cyan-500': 'bg-cyan-500',
  'blue-500': 'bg-blue-500',
  'indigo-500': 'bg-indigo-500',
  'violet-500': 'bg-violet-500',
  'purple-500': 'bg-purple-500',
  'pink-500': 'bg-pink-500',
  'rose-500': 'bg-rose-500',
}

function getColorBg(color: string): string {
  return COLOR_BG[color] ?? 'bg-blue-500'
}

// =============================================
// データ取得
// =============================================
async function fetchDashboardData() {
  try {
    const { supabase } = await createAuthenticatedSupabaseClient()

    const now = new Date()
    const startToday = startOfDayJST(now)
    const startWeek = startOfWeekJST(now)
    const startMonth = startOfMonthJST(now)
    // 週と月で早い方から取得
    const queryFrom = startWeek < startMonth ? startWeek : startMonth

    // 統計用: 今月〜今日分をまとめて取得
    const { data: statsEntries } = await supabase
      .from('time_entries')
      .select('started_at, duration_seconds')
      .gte('started_at', queryFrom.toISOString())

    const todaySeconds =
      statsEntries
        ?.filter((e) => new Date(e.started_at) >= startToday)
        .reduce((sum, e) => sum + e.duration_seconds, 0) ?? 0

    const weekSeconds =
      statsEntries
        ?.filter((e) => new Date(e.started_at) >= startWeek)
        .reduce((sum, e) => sum + e.duration_seconds, 0) ?? 0

    const monthSeconds =
      statsEntries
        ?.filter((e) => new Date(e.started_at) >= startMonth)
        .reduce((sum, e) => sum + e.duration_seconds, 0) ?? 0

    // 最近10件（カテゴリ情報含む）
    const { data: recentEntries } = await supabase
      .from('time_entries')
      .select('*, category:categories(*)')
      .order('started_at', { ascending: false })
      .limit(10)

    return {
      todaySeconds,
      weekSeconds,
      monthSeconds,
      recentEntries: (recentEntries as TimeEntry[]) ?? [],
    }
  } catch {
    return { todaySeconds: 0, weekSeconds: 0, monthSeconds: 0, recentEntries: [] }
  }
}

// =============================================
// ページ
// =============================================
export default async function DashboardPage() {
  const { todaySeconds, weekSeconds, monthSeconds, recentEntries } =
    await fetchDashboardData()

  const statCards = [
    {
      label: '今日の作業時間',
      icon: Clock,
      value: formatDuration(todaySeconds),
      sub: todaySeconds > 0 ? `${Math.ceil(todaySeconds / 60)}分の作業` : '記録がありません',
    },
    {
      label: '今週の作業時間',
      icon: Calendar,
      value: formatDuration(weekSeconds),
      sub: weekSeconds > 0 ? `${Math.ceil(weekSeconds / 60)}分の作業` : '記録がありません',
    },
    {
      label: '今月の作業時間',
      icon: TrendingUp,
      value: formatDuration(monthSeconds),
      sub: monthSeconds > 0 ? `${Math.ceil(monthSeconds / 60)}分の作業` : '記録がありません',
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ページタイトル */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-600">作業時間のサマリーと最近の記録</p>
        </div>
        <ManualEntryModal />
      </div>

      {/* 統計カード */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {/* タイマーエリア */}
      <div className="mb-8">
        <TimerSection />
      </div>

      {/* 最近の作業記録 */}
      <div className="rounded-2xl border border-gray-300 bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">最近の作業記録</h2>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors duration-200 hover:text-blue-800"
          >
            カテゴリを管理
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-300 bg-gray-50 shadow-sm">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="mb-1 font-semibold text-gray-700">作業記録がありません</p>
            <p className="text-sm text-gray-500">タイマーを使って作業時間を記録しましょう</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-gray-50"
              >
                {/* カテゴリカラー */}
                <div
                  className={`h-3 w-3 flex-shrink-0 rounded-full ${
                    entry.category ? getColorBg(entry.category.color) : 'bg-gray-300'
                  }`}
                />

                {/* カテゴリ名 */}
                <span className="w-32 flex-shrink-0 truncate text-sm font-semibold text-gray-900">
                  {entry.category?.name ?? '不明'}
                </span>

                {/* 作業時間 */}
                <span className="flex-1 text-sm font-semibold text-blue-700">
                  {formatDuration(entry.duration_seconds)}
                </span>

                {/* メモ */}
                {entry.memo && (
                  <span className="hidden max-w-xs truncate text-sm text-gray-500 sm:block">
                    {entry.memo}
                  </span>
                )}

                {/* 日時 */}
                <span className="flex-shrink-0 text-xs text-gray-500">
                  {formatEntryDate(entry.started_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
