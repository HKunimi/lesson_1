import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'

const JST_OFFSET = 9 * 60 * 60 * 1000

function formatJST(isoString: string): { date: string; time: string } {
  const jst = new Date(new Date(isoString).getTime() + JST_OFFSET)
  const date = jst.toISOString().slice(0, 10).replace(/-/g, '/')
  const h = String(jst.getUTCHours()).padStart(2, '0')
  const m = String(jst.getUTCMinutes()).padStart(2, '0')
  return { date, time: `${h}:${m}` }
}

/** CSV セルのエスケープ（RFC 4180準拠） */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { supabase } = await createAuthenticatedSupabaseClient()
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from') // YYYY-MM-DD (JST)
    const toDate   = searchParams.get('to')   // YYYY-MM-DD (JST)

    let query = supabase
      .from('time_entries')
      .select('*, category:categories(*)')
      .order('started_at', { ascending: true })

    if (fromDate) {
      const [y, mo, d] = fromDate.split('-').map(Number)
      query = query.gte('started_at', new Date(Date.UTC(y, mo - 1, d) - JST_OFFSET).toISOString())
    }
    if (toDate) {
      // toDate の翌日 00:00 JST まで（当日終日を含む）
      const [y, mo, d] = toDate.split('-').map(Number)
      query = query.lt('started_at', new Date(Date.UTC(y, mo - 1, d + 1) - JST_OFFSET).toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    // ヘッダー行
    const headers = ['日付', 'カテゴリ', '開始時刻', '終了時刻', '作業時間（分）', '作業時間（時間）', 'メモ']

    // データ行
    const rows = (data ?? []).map((entry) => {
      const start   = formatJST(entry.started_at)
      const end     = formatJST(entry.ended_at)
      const minutes = Math.round(entry.duration_seconds / 60)
      const hours   = (entry.duration_seconds / 3600).toFixed(2)
      return [
        start.date,
        entry.category?.name ?? '',
        start.time,
        end.time,
        String(minutes),
        hours,
        entry.memo ?? '',
      ].map(escapeCSV)
    })

    // BOM付き UTF-8（Excel で文字化けしない）
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.join(',')).join('\r\n')

    const from = fromDate ?? 'all'
    const to   = toDate   ?? 'all'
    const filename = `project-tracker-${from}-${to}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
