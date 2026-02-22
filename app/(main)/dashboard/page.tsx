import { Clock, Calendar, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import TimerSection from '@/components/TimerSection'
import ManualEntryModal from '@/components/ManualEntryModal'
import WorkHistory from '@/components/WorkHistory'
import ExportModal from '@/components/ExportModal'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { Category, TimeEntry } from '@/types'

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


/** JST 日付キー（YYYY-MM-DD）を返す */
function jstDateKey(isoString: string): string {
  const jst = new Date(new Date(isoString).getTime() + JST_OFFSET)
  return jst.toISOString().slice(0, 10)
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
    const queryFrom = startWeek < startMonth ? startWeek : startMonth

    // 統計用エントリ（今週 or 今月の早い方から取得）
    const { data: statsEntries } = await supabase
      .from('time_entries')
      .select('started_at, duration_seconds')
      .gte('started_at', queryFrom.toISOString())

    const all = statsEntries ?? []

    const todayEntries = all.filter((e) => new Date(e.started_at) >= startToday)
    const weekEntries  = all.filter((e) => new Date(e.started_at) >= startWeek)
    const monthEntries = all.filter((e) => new Date(e.started_at) >= startMonth)

    const todaySeconds  = todayEntries.reduce((s, e) => s + e.duration_seconds, 0)
    const weekSeconds   = weekEntries.reduce((s, e) => s + e.duration_seconds, 0)
    const monthSeconds  = monthEntries.reduce((s, e) => s + e.duration_seconds, 0)

    const todayCount = todayEntries.length
    const weekCount  = weekEntries.length
    const monthCount = monthEntries.length

    // アクティブ日数（ユニーク日付の数）
    const weekActiveDays  = new Set(weekEntries.map((e) => jstDateKey(e.started_at))).size
    const monthActiveDays = new Set(monthEntries.map((e) => jstDateKey(e.started_at))).size

    // 今週の日別秒数（月〜日の7日分）
    const weekDaySeconds: number[] = Array(7).fill(0)
    for (const e of weekEntries) {
      const jst = new Date(new Date(e.started_at).getTime() + JST_OFFSET)
      const dow = jst.getUTCDay() // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1 // 月=0 … 日=6
      weekDaySeconds[idx] += e.duration_seconds
    }

    // 作業履歴（カテゴリ情報含む、最大50件）
    const { data: recentEntries } = await supabase
      .from('time_entries')
      .select('*, category:categories(*)')
      .order('started_at', { ascending: false })
      .limit(50)

    // カテゴリ一覧（編集モーダル用）
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true })

    return {
      todaySeconds, weekSeconds, monthSeconds,
      todayCount, weekCount, monthCount,
      weekActiveDays, monthActiveDays,
      weekDaySeconds,
      recentEntries: (recentEntries as TimeEntry[]) ?? [],
      categories: (categories as Category[]) ?? [],
    }
  } catch {
    return {
      todaySeconds: 0, weekSeconds: 0, monthSeconds: 0,
      todayCount: 0, weekCount: 0, monthCount: 0,
      weekActiveDays: 0, monthActiveDays: 0,
      weekDaySeconds: Array(7).fill(0),
      recentEntries: [], categories: [],
    }
  }
}

// =============================================
// ページ
// =============================================
const WEEK_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default async function DashboardPage() {
  const {
    todaySeconds, weekSeconds, monthSeconds,
    todayCount, weekCount, monthCount,
    weekActiveDays, monthActiveDays,
    weekDaySeconds,
    recentEntries, categories,
  } = await fetchDashboardData()

  // 今日が週の何日目か（月=0）
  const nowJST = new Date(Date.now() + JST_OFFSET)
  const todayDowIdx = nowJST.getUTCDay() === 0 ? 6 : nowJST.getUTCDay() - 1

  // 週・月の日平均（アクティブ日のみ）
  const weekDailyAvg  = weekActiveDays  > 0 ? Math.floor(weekSeconds  / weekActiveDays)  : 0
  const monthDailyAvg = monthActiveDays > 0 ? Math.floor(monthSeconds / monthActiveDays) : 0

  // 週間チャートの最大値（バーの高さ計算用）
  const weekMaxSeconds = Math.max(...weekDaySeconds, 1)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ページタイトル */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-600">作業時間のサマリーと最近の記録</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportModal />
          <ManualEntryModal />
        </div>
      </div>

      {/* 統計カード */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 今日 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">今日の作業時間</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(todaySeconds)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {todayCount > 0 ? `${todayCount}件の記録` : '記録がありません'}
          </p>
        </div>

        {/* 今週 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">今週の作業時間</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(weekSeconds)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {weekCount > 0
              ? `${weekCount}件 / ${weekActiveDays}日 / 平均 ${formatDuration(weekDailyAvg)}/日`
              : '記録がありません'}
          </p>
        </div>

        {/* 今月 */}
        <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">今月の作業時間</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(monthSeconds)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {monthCount > 0
              ? `${monthCount}件 / ${monthActiveDays}日 / 平均 ${formatDuration(monthDailyAvg)}/日`
              : '記録がありません'}
          </p>
        </div>
      </div>

      {/* 今週の日別チャート */}
      <div className="mb-8 rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
        <p className="mb-4 text-sm font-semibold text-gray-700">今週の日別作業時間</p>
        <div className="flex items-end justify-between gap-2">
          {weekDaySeconds.map((sec, i) => {
            const isToday = i === todayDowIdx
            const heightPct = Math.round((sec / weekMaxSeconds) * 100)
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                {/* 時間ラベル */}
                {sec > 0 && (
                  <span className="text-xs font-semibold text-blue-700">
                    {Math.floor(sec / 3600) > 0
                      ? `${Math.floor(sec / 3600)}h`
                      : `${Math.floor(sec / 60)}m`}
                  </span>
                )}
                {/* バー */}
                <div className="flex h-24 w-full items-end rounded-lg bg-gray-100">
                  {sec > 0 && (
                    <div
                      className={`w-full rounded-lg transition-all duration-300 ${
                        isToday ? 'bg-blue-500' : 'bg-blue-300'
                      }`}
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                  )}
                </div>
                {/* 曜日ラベル */}
                <span
                  className={`text-xs font-semibold ${
                    isToday ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {WEEK_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* タイマーエリア */}
      <div className="mb-8">
        <TimerSection />
      </div>

      {/* 作業履歴 */}
      <div className="rounded-2xl border border-gray-300 bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">作業履歴</h2>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-sm font-semibold text-blue-700 transition-colors duration-200 hover:text-blue-800"
          >
            カテゴリを管理
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <WorkHistory entries={recentEntries} categories={categories} />
      </div>
    </div>
  )
}
