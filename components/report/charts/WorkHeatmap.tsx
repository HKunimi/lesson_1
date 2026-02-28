'use client'

export type Tab = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface DailyStat {
  date:    string  // YYYY-MM-DD
  seconds: number
}

// 作業時間に応じた intensity カラー
function intensityColor(seconds: number): string {
  if (seconds === 0) return '#F3F4F6'
  const h = seconds / 3600
  if (h < 1) return '#DBEAFE'   // blue-100
  if (h < 2) return '#93C5FD'   // blue-300
  if (h < 4) return '#3B82F6'   // blue-500
  if (h < 6) return '#1D4ED8'   // blue-700
  return '#1E3A8A'               // blue-900
}

function textColor(seconds: number): string {
  if (seconds === 0) return '#D1D5DB'
  return seconds / 3600 >= 4 ? '#FFFFFF' : '#374151'
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function fmtHours(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`
}

// ── 強度凡例 ──────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="mt-3 flex items-center justify-end gap-1.5">
      <span className="text-xs text-gray-400">少</span>
      {[0, 3600, 7200, 14400, 21600].map((s) => (
        <div
          key={s}
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: intensityColor(s) }}
        />
      ))}
      <span className="text-xs text-gray-400">多</span>
    </div>
  )
}

// ── 週次: 7セル横並び ──────────────────────────────────────────────────────────
function WeeklyHeatmap({ secMap, fromDateJST }: { secMap: Record<string, number>; fromDateJST: string }) {
  const DOW = ['月', '火', '水', '木', '金', '土', '日']
  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const date = addDays(fromDateJST, i)
          const sec  = secMap[date] ?? 0
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-500">{DOW[i]}</span>
              <div
                title={`${date}: ${fmtHours(sec)}`}
                className="h-12 w-full rounded-xl"
                style={{ backgroundColor: intensityColor(sec) }}
              />
              <span className="text-xs text-gray-500">
                {sec > 0 ? fmtHours(sec) : '—'}
              </span>
            </div>
          )
        })}
      </div>
      <Legend />
    </div>
  )
}

// ── 月次: カレンダーグリッド ──────────────────────────────────────────────────
function MonthlyHeatmap({ secMap, year, month }: { secMap: Record<string, number>; year: number; month: number }) {
  const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']
  const firstDay   = new Date(Date.UTC(year, month - 1, 1))
  const dow        = firstDay.getUTCDay()
  const startPad   = dow === 0 ? 6 : dow - 1
  const numDays    = daysInMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW_LABELS.map((l) => (
          <div key={l} className="py-1 text-xs font-semibold text-gray-500">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const sec     = secMap[dateStr] ?? 0
          return (
            <div
              key={i}
              title={`${dateStr}: ${fmtHours(sec)}`}
              className="flex aspect-square items-center justify-center rounded-sm text-xs font-semibold"
              style={{ backgroundColor: intensityColor(sec), color: textColor(sec) }}
            >
              {day}
            </div>
          )
        })}
      </div>
      <Legend />
    </div>
  )
}

// ── 年次: GitHub スタイル 52週×7日 ──────────────────────────────────────────
function YearlyHeatmap({ secMap, year }: { secMap: Record<string, number>; year: number }) {
  const MONTH_ABBR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const ROW_LABELS = ['', '火', '', '木', '', '土', '']

  // 年の全日を生成
  const start = new Date(Date.UTC(year, 0, 1))
  const end   = new Date(Date.UTC(year + 1, 0, 1))
  const allDays: string[] = []
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 86400000)) {
    allDays.push(d.toISOString().slice(0, 10))
  }

  // 月曜始まりになるよう前パディング
  const firstDow = start.getUTCDay()
  const offset   = firstDow === 0 ? 6 : firstDow - 1
  const padded: (string | null)[] = [...Array(offset).fill(null), ...allDays]

  // 7日ずつ週に分割（列 = 週）
  const weeks: (string | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {/* 行ラベル */}
        <div className="flex flex-col gap-0.5 pt-5 pr-1">
          {ROW_LABELS.map((l, i) => (
            <div key={i} style={{ height: 13, fontSize: 10, color: '#9CA3AF', textAlign: 'right', width: 14, lineHeight: '13px' }}>
              {l}
            </div>
          ))}
        </div>

        {/* 週列 */}
        <div className="flex flex-col">
          {/* 月ラベル行 */}
          <div className="mb-1 flex gap-1">
            {weeks.map((week, wi) => {
              const firstReal = week.find((d) => d !== null)
              const show = firstReal && firstReal.slice(8) === '01'
              return (
                <div key={wi} style={{ width: 13, fontSize: 9, color: '#9CA3AF', textAlign: 'center' }}>
                  {show ? MONTH_ABBR[parseInt(firstReal!.slice(5, 7)) - 1] : ''}
                </div>
              )
            })}
          </div>

          {/* セルグリッド */}
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => {
                  if (!day) return <div key={di} style={{ width: 13, height: 13 }} />
                  const sec = secMap[day] ?? 0
                  return (
                    <div
                      key={di}
                      title={`${day}: ${fmtHours(sec)}`}
                      style={{ width: 13, height: 13, borderRadius: 2, backgroundColor: intensityColor(sec) }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Legend />
    </div>
  )
}

// ── メインエクスポート ─────────────────────────────────────────────────────────

interface Props {
  data:         DailyStat[]
  fromDateJST:  string  // YYYY-MM-DD (JST 開始日)
  tab:          Tab
}

export function WorkHeatmap({ data, fromDateJST, tab }: Props) {
  if (tab === 'daily') return null

  const secMap: Record<string, number> = {}
  for (const d of data) {
    secMap[d.date] = (secMap[d.date] ?? 0) + d.seconds
  }

  if (tab === 'weekly') {
    return <WeeklyHeatmap secMap={secMap} fromDateJST={fromDateJST} />
  }

  if (tab === 'monthly') {
    const [y, m] = fromDateJST.split('-').map(Number)
    return <MonthlyHeatmap secMap={secMap} year={y} month={m} />
  }

  if (tab === 'yearly') {
    const year = parseInt(fromDateJST.slice(0, 4))
    return <YearlyHeatmap secMap={secMap} year={year} />
  }

  return null
}
