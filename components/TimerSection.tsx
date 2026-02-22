'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, Square, ChevronDown } from 'lucide-react'
import { useTimer, formatSeconds } from '@/lib/use-timer'
import { Category } from '@/types'

const COLOR_OPTIONS: Record<string, string> = {
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
  return COLOR_OPTIONS[color] ?? 'bg-blue-500'
}

export default function TimerSection() {
  const router = useRouter()
  const { state, displaySeconds, start, pause, resume, setCategoryId, reset, computeElapsed } =
    useTimer()
  const [categories, setCategories] = useState<Category[]>([])
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCategories(json.data)
      })
      .catch(() => {})
  }, [])

  async function handleStop() {
    if (!state.category_id) {
      setSaveError('カテゴリを選択してから停止してください')
      return
    }

    const elapsedSeconds = computeElapsed(state)
    if (elapsedSeconds < 1) {
      setSaveError('1秒以上計測してください')
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const endedAt = new Date().toISOString()

    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: state.category_id,
          started_at: state.started_at,
          ended_at: endedAt,
          duration_seconds: elapsedSeconds,
          memo: memo.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      reset()
      setMemo('')
      router.refresh() // ダッシュボードの統計・履歴を再取得
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === state.category_id)

  const isIdle = state.status === 'idle'
  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'

  return (
    <div className="rounded-2xl border border-gray-300 bg-white p-8 shadow-md">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">タイマー</h2>

      <div className="flex flex-col items-center gap-6">
        {/* 経過時間表示 */}
        <div
          className={`text-5xl font-bold tabular-nums transition-colors duration-300 ${
            isRunning
              ? 'text-blue-600'
              : isPaused
                ? 'text-amber-600'
                : 'text-gray-900'
          }`}
        >
          {formatSeconds(displaySeconds)}
        </div>

        {/* ステータスラベル */}
        {!isIdle && (
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                計測中
              </span>
            )}
            {isPaused && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                一時停止中
              </span>
            )}
            {selectedCategory && (
              <span className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${getColorBg(selectedCategory.color)}`}
                />
                {selectedCategory.name}
              </span>
            )}
          </div>
        )}

        {/* カテゴリ選択 */}
        <div className="relative w-full max-w-xs">
          <select
            value={state.category_id ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className="h-12 w-full appearance-none rounded-lg border border-gray-300 px-4 pr-10 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
          >
            <option value="">カテゴリを選択（必須）</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>

        {/* メモ入力 */}
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモ（任意）"
            maxLength={200}
            className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
          />
        </div>

        {/* ボタン */}
        <div className="flex items-center gap-3">
          {isIdle && (
            <button
              onClick={() => start(state.category_id)}
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-8 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg active:scale-95"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              開始
            </button>
          )}

          {isRunning && (
            <>
              <button
                onClick={pause}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-amber-600 hover:shadow-lg active:scale-95"
              >
                <Pause className="h-4 w-4" fill="currentColor" />
                一時停止
              </button>
              <button
                onClick={handleStop}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-red-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square className="h-4 w-4" fill="currentColor" />
                {saving ? '保存中...' : '停止'}
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={resume}
                className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg active:scale-95"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                再開
              </button>
              <button
                onClick={handleStop}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-red-700 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square className="h-4 w-4" fill="currentColor" />
                {saving ? '保存中...' : '停止・保存'}
              </button>
            </>
          )}
        </div>

        {/* エラー */}
        {saveError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {saveError}
          </p>
        )}

        {/* 成功メッセージ */}
        {saveSuccess && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            作業時間を記録しました
          </p>
        )}
      </div>
    </div>
  )
}
