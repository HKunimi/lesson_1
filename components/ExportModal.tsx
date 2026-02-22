'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'

type RangePreset = 'today' | 'week' | 'month' | 'last30' | 'last90' | 'custom'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today',  label: '今日' },
  { value: 'week',   label: '今週' },
  { value: 'month',  label: '今月' },
  { value: 'last30', label: '過去30日' },
  { value: 'last90', label: '過去90日' },
  { value: 'custom', label: 'カスタム' },
]

const JST_OFFSET = 9 * 60 * 60 * 1000

function todayJST(): string {
  return new Date(Date.now() + JST_OFFSET).toISOString().slice(0, 10)
}

function daysAgoJST(days: number): string {
  return new Date(Date.now() + JST_OFFSET - days * 86400_000).toISOString().slice(0, 10)
}

function startOfWeekJST(): string {
  const jst = new Date(Date.now() + JST_OFFSET)
  const dow = jst.getUTCDay()
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  return new Date(Date.now() + JST_OFFSET - daysFromMonday * 86400_000).toISOString().slice(0, 10)
}

function startOfMonthJST(): string {
  const jst = new Date(Date.now() + JST_OFFSET)
  return `${jst.toISOString().slice(0, 7)}-01`
}

function getRange(preset: RangePreset, customFrom: string, customTo: string) {
  const today = todayJST()
  switch (preset) {
    case 'today':  return { from: today,              to: today }
    case 'week':   return { from: startOfWeekJST(),   to: today }
    case 'month':  return { from: startOfMonthJST(),  to: today }
    case 'last30': return { from: daysAgoJST(29),     to: today }
    case 'last90': return { from: daysAgoJST(89),     to: today }
    case 'custom': return { from: customFrom,         to: customTo }
  }
}

export default function ExportModal() {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(todayJST())
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setError(null)
    setOpen(true)
  }

  async function handleDownload() {
    setError(null)
    const { from, to } = getRange(preset, customFrom, customTo)

    if (!from || !to) {
      setError('開始日と終了日を入力してください')
      return
    }
    if (from > to) {
      setError('終了日は開始日以降を選択してください')
      return
    }

    setDownloading(true)
    try {
      const params = new URLSearchParams({ from, to })
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? 'ダウンロードに失敗しました')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-tracker-${from}-${to}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ダウンロードに失敗しました')
    } finally {
      setDownloading(false)
    }
  }

  // 現在の範囲をプレビュー表示
  const { from, to } = getRange(preset, customFrom, customTo)
  const rangeLabel = from && to && from <= to ? `${from} 〜 ${to}` : null

  return (
    <>
      {/* トリガーボタン */}
      <button
        onClick={openModal}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md active:scale-95"
      >
        <Download className="h-4 w-4" />
        エクスポート
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            {/* ヘッダー */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">CSVエクスポート</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* 範囲プリセット */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  エクスポート範囲
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPreset(p.value)}
                      className={`rounded-xl border-2 py-2 text-sm font-semibold transition-all duration-200 ${
                        preset === p.value
                          ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* カスタム日付 */}
              {preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      開始日 <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={customFrom}
                      max={todayJST()}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      終了日 <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={customTo}
                      max={todayJST()}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                    />
                  </div>
                </div>
              )}

              {/* 範囲プレビュー */}
              {rangeLabel && preset !== 'custom' && (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
                  対象期間：<span className="font-semibold text-gray-900">{rangeLabel}</span>
                </p>
              )}

              {/* CSV列の説明 */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-gray-600">出力列</p>
                <p className="text-xs text-gray-500">
                  日付 / カテゴリ / 開始時刻 / 終了時刻 / 作業時間（分）/ 作業時間（時間）/ メモ
                </p>
              </div>

              {/* エラー */}
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'ダウンロード中...' : 'ダウンロード'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
