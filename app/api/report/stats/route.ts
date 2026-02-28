import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'

const JST_OFFSET = 9 * 60 * 60 * 1000

function jstDateKey(isoString: string): string {
  const jst = new Date(new Date(isoString).getTime() + JST_OFFSET)
  return jst.toISOString().slice(0, 10)
}

interface StatsEntry {
  started_at:       string
  duration_seconds: number
}

interface FullEntry extends StatsEntry {
  category_id: string | null
  category:    { id: string; name: string; color: string } | null
}

function computeStats(entries: StatsEntry[]) {
  return {
    total_seconds: entries.reduce((s, e) => s + e.duration_seconds, 0),
    entry_count:   entries.length,
    active_days:   new Set(entries.map((e) => jstDateKey(e.started_at))).size,
  }
}

function computeCategoryBreakdown(entries: FullEntry[]) {
  const map = new Map<string, { name: string; color: string; seconds: number }>()
  for (const e of entries) {
    if (!e.category) continue
    const { id, name, color } = e.category
    const cur = map.get(id) ?? { name, color, seconds: 0 }
    cur.seconds += e.duration_seconds
    map.set(id, cur)
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.seconds - a.seconds)
}

function computeDailyBreakdown(entries: StatsEntry[]) {
  const map = new Map<string, number>()
  for (const e of entries) {
    const key = jstDateKey(e.started_at)
    map.set(key, (map.get(key) ?? 0) + e.duration_seconds)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, seconds]) => ({ date, seconds }))
}

/** JST 時刻別（0〜23）の集計 */
function computeHourlyBreakdown(entries: FullEntry[]) {
  const map = new Map<number, number>()
  for (const e of entries) {
    const jst  = new Date(new Date(e.started_at).getTime() + JST_OFFSET)
    const hour = jst.getUTCHours()
    map.set(hour, (map.get(hour) ?? 0) + e.duration_seconds)
  }
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, seconds: map.get(h) ?? 0 }))
}

/** カテゴリ × 日付 の集計（カテゴリ推移グラフ用） */
function computeCategoryDailyBreakdown(entries: FullEntry[]) {
  const map = new Map<string, Map<string, number>>()  // date → categoryId → seconds
  for (const e of entries) {
    if (!e.category_id) continue
    const date = jstDateKey(e.started_at)
    if (!map.has(date)) map.set(date, new Map())
    const inner = map.get(date)!
    inner.set(e.category_id, (inner.get(e.category_id) ?? 0) + e.duration_seconds)
  }
  const result: { date: string; category_id: string; seconds: number }[] = []
  for (const [date, catMap] of map) {
    for (const [category_id, seconds] of catMap) {
      result.push({ date, category_id, seconds })
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

// GET /api/report/stats?from=ISO&to=ISO&prevFrom=ISO&prevTo=ISO
export async function GET(request: Request) {
  try {
    const { supabase } = await createAuthenticatedSupabaseClient()
    const { searchParams } = new URL(request.url)
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')
    const prevFrom = searchParams.get('prevFrom')
    const prevTo   = searchParams.get('prevTo')

    // 現在期間（カテゴリ情報込み）
    let curQ = supabase
      .from('time_entries')
      .select('started_at, duration_seconds, category_id, category:categories(id, name, color)')
    if (from) curQ = curQ.gte('started_at', from)
    if (to)   curQ = curQ.lt('started_at', to)
    const { data: curData, error: e1 } = await curQ
    if (e1) throw e1

    // 前期間（統計のみ）
    let prevQ = supabase
      .from('time_entries')
      .select('started_at, duration_seconds')
    if (prevFrom) prevQ = prevQ.gte('started_at', prevFrom)
    if (prevTo)   prevQ = prevQ.lt('started_at', prevTo)
    const { data: prevData, error: e2 } = await prevQ
    if (e2) throw e2

    const cur = (curData ?? []) as unknown as FullEntry[]

    return NextResponse.json({
      current:                   computeStats(cur),
      previous:                  computeStats(prevData ?? []),
      category_breakdown:        computeCategoryBreakdown(cur),
      daily_breakdown:           computeDailyBreakdown(cur),
      hourly_breakdown:          computeHourlyBreakdown(cur),
      category_daily_breakdown:  computeCategoryDailyBreakdown(cur),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
