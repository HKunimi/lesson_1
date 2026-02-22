'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Category } from '@/types'

// =============================================
// 型 / 定数
// =============================================
type InputMode = 'time-range' | 'duration'

interface FormState {
  mode: InputMode
  date: string         // YYYY-MM-DD
  start_time: string   // HH:MM
  end_time: string     // HH:MM（time-range モード）
  duration_hours: string
  duration_minutes: string
  category_id: string
  memo: string
}

/** 現在の JST 日付を YYYY-MM-DD で返す */
function todayJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

/** 現在の JST 時刻を HH:MM で返す（30分単位に丸め） */
function nowTimeJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const h = jst.getUTCHours()
  const m = jst.getUTCMinutes() < 30 ? 0 : 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** JST 日付 + 時刻 → UTC ISO 文字列 */
function jstToUTC(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hours - 9, minutes)).toISOString()
}

const DEFAULT_FORM = (): FormState => ({
  mode: 'time-range',
  date: todayJST(),
  start_time: nowTimeJST(),
  end_time: '',
  duration_hours: '',
  duration_minutes: '',
  category_id: '',
  memo: '',
})

// =============================================
// コンポーネント
// =============================================
export default function ManualEntryModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => { if (json.data) setCategories(json.data) })
      .catch(() => {})
  }, [])

  function openModal() {
    setForm(DEFAULT_FORM())
    setFormError(null)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setFormError(null)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // =============================================
  // バリデーション + 送信
  // =============================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    // 共通バリデーション
    if (!form.date) return setFormError('日付を入力してください')
    if (!form.start_time) return setFormError('開始時刻を入力してください')
    if (!form.category_id) return setFormError('カテゴリを選択してください')

    let started_at: string
    let ended_at: string
    let duration_seconds: number

    if (form.mode === 'time-range') {
      if (!form.end_time) return setFormError('終了時刻を入力してください')

      started_at = jstToUTC(form.date, form.start_time)
      ended_at = jstToUTC(form.date, form.end_time)

      duration_seconds = Math.floor(
        (new Date(ended_at).getTime() - new Date(started_at).getTime()) / 1000
      )

      if (duration_seconds <= 0) return setFormError('終了時刻は開始時刻より後にしてください')
      if (duration_seconds > 24 * 3600) return setFormError('24時間を超える記録はできません')
    } else {
      const h = parseInt(form.duration_hours || '0', 10)
      const m = parseInt(form.duration_minutes || '0', 10)

      if (isNaN(h) || isNaN(m) || (h === 0 && m === 0))
        return setFormError('作業時間を入力してください（1分以上）')
      if (h < 0 || m < 0 || m > 59) return setFormError('正しい時間を入力してください')
      if (h > 24 || (h === 24 && m > 0)) return setFormError('24時間を超える記録はできません')

      duration_seconds = h * 3600 + m * 60
      started_at = jstToUTC(form.date, form.start_time)
      ended_at = new Date(new Date(started_at).getTime() + duration_seconds * 1000).toISOString()
    }

    // 未来日時チェック
    if (new Date(started_at) > new Date()) return setFormError('未来の日時は記録できません')

    setSubmitting(true)
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: form.category_id,
          started_at,
          ended_at,
          duration_seconds,
          memo: form.memo.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)

      router.refresh()
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  // =============================================
  // レンダリング
  // =============================================
  return (
    <>
      {/* トリガーボタン */}
      <button
        onClick={openModal}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md active:scale-95"
      >
        <Plus className="h-4 w-4" />
        手動で追加
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            {/* ヘッダー */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">作業時間を手動入力</h2>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 入力モード切り替え */}
              <div className="flex rounded-xl border border-gray-300 p-1">
                <button
                  type="button"
                  onClick={() => setField('mode', 'time-range')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                    form.mode === 'time-range'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  開始〜終了時刻
                </button>
                <button
                  type="button"
                  onClick={() => setField('mode', 'duration')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                    form.mode === 'duration'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  時間を直接入力
                </button>
              </div>

              {/* 日付 */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  日付 <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  max={todayJST()}
                  onChange={(e) => setField('date', e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* 開始時刻 */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  開始時刻 <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setField('start_time', e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* 終了時刻 or 作業時間 */}
              {form.mode === 'time-range' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    終了時刻 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setField('end_time', e.target.value)}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    作業時間 <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        placeholder="0"
                        value={form.duration_hours}
                        onChange={(e) => setField('duration_hours', e.target.value)}
                        className="h-12 w-full rounded-lg border border-gray-300 px-4 text-center text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                      />
                      <span className="flex-shrink-0 text-sm font-semibold text-gray-700">時間</span>
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={form.duration_minutes}
                        onChange={(e) => setField('duration_minutes', e.target.value)}
                        className="h-12 w-full rounded-lg border border-gray-300 px-4 text-center text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                      />
                      <span className="flex-shrink-0 text-sm font-semibold text-gray-700">分</span>
                    </div>
                  </div>
                </div>
              )}

              {/* カテゴリ */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  カテゴリ <span className="text-red-600">*</span>
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setField('category_id', e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                >
                  <option value="">カテゴリを選択</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* メモ */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  メモ <span className="text-xs font-normal text-gray-500">（任意）</span>
                </label>
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => setField('memo', e.target.value)}
                  placeholder="例: デザインレビュー"
                  maxLength={200}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* エラー */}
              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                  {formError}
                </p>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-500 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '記録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
