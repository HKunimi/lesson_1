'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X, ChevronDown } from 'lucide-react'
import { TimeEntry, Category } from '@/types'

// =============================================
// 定数・ユーティリティ
// =============================================
const JST_OFFSET = 9 * 60 * 60 * 1000

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

function getColorBg(color: string) {
  return COLOR_BG[color] ?? 'bg-blue-500'
}

function toJST(isoString: string) {
  return new Date(new Date(isoString).getTime() + JST_OFFSET)
}

function getJSTDateKey(isoString: string): string {
  return toJST(isoString).toISOString().slice(0, 10)
}

function formatDateHeader(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const dow = ['日', '月', '火', '水', '木', '金', '土'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ]
  return `${year}年${month}月${day}日（${dow}）`
}

function formatTimeRange(started_at: string, ended_at: string): string {
  const s = toJST(started_at)
  const e = toJST(ended_at)
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  return `${fmt(s)} - ${fmt(e)}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分`
}

/** 日付キー → エントリ一覧 の順序付きリストを返す */
function groupByDate(entries: TimeEntry[]): { dateKey: string; entries: TimeEntry[] }[] {
  const map = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const key = getJSTDateKey(entry.started_at)
    const group = map.get(key) ?? []
    group.push(entry)
    map.set(key, group)
  }
  return Array.from(map.entries()).map(([dateKey, entries]) => ({ dateKey, entries }))
}

// =============================================
// 編集フォーム型
// =============================================
interface EditForm {
  category_id: string
  date: string       // YYYY-MM-DD (JST)
  start_time: string // HH:MM (JST)
  end_time: string   // HH:MM (JST)
  memo: string
}

function jstToUTC(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString()
}

function entryToEditForm(entry: TimeEntry): EditForm {
  const s = toJST(entry.started_at)
  const e = toJST(entry.ended_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    category_id: entry.category_id,
    date: s.toISOString().slice(0, 10),
    start_time: `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`,
    end_time: `${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`,
    memo: entry.memo ?? '',
  }
}

// =============================================
// コンポーネント
// =============================================
interface WorkHistoryProps {
  entries: TimeEntry[]
  categories: Category[]
}

export default function WorkHistory({ entries, categories }: WorkHistoryProps) {
  const router = useRouter()
  const grouped = groupByDate(entries)

  // 削除
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/time-entries/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setDeleteTarget(null)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  // 編集
  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openEdit(entry: TimeEntry) {
    setEditTarget(entry)
    setEditForm(entryToEditForm(entry))
    setEditError(null)
  }

  function closeEdit() {
    setEditTarget(null)
    setEditForm(null)
    setEditError(null)
  }

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !editForm) return
    setEditError(null)

    if (!editForm.category_id) return setEditError('カテゴリを選択してください')
    if (!editForm.start_time) return setEditError('開始時刻を入力してください')
    if (!editForm.end_time) return setEditError('終了時刻を入力してください')

    const started_at = jstToUTC(editForm.date, editForm.start_time)
    const ended_at = jstToUTC(editForm.date, editForm.end_time)
    const duration_seconds = Math.floor(
      (new Date(ended_at).getTime() - new Date(started_at).getTime()) / 1000
    )

    if (duration_seconds <= 0) return setEditError('終了時刻は開始時刻より後にしてください')
    if (duration_seconds > 24 * 3600) return setEditError('24時間を超える記録はできません')

    setSaving(true)
    try {
      const res = await fetch(`/api/time-entries/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: editForm.category_id,
          started_at,
          ended_at,
          duration_seconds,
          memo: editForm.memo.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      closeEdit()
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // =============================================
  // 空状態
  // =============================================
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="mb-1 font-semibold text-gray-700">作業記録がありません</p>
        <p className="text-sm text-gray-500">タイマーまたは手動入力で作業時間を記録しましょう</p>
      </div>
    )
  }

  // =============================================
  // カテゴリ別合計
  // =============================================
  const categoryTotals = entries.reduce<
    Record<string, { name: string; color: string; seconds: number }>
  >((acc, entry) => {
    const id = entry.category_id
    if (!acc[id]) {
      acc[id] = {
        name: entry.category?.name ?? '不明',
        color: entry.category?.color ?? 'blue-500',
        seconds: 0,
      }
    }
    acc[id].seconds += entry.duration_seconds
    return acc
  }, {})

  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b.seconds - a.seconds
  )
  const totalSeconds = entries.reduce((s, e) => s + e.duration_seconds, 0)

  // =============================================
  // 一覧（日付グルーピング）
  // =============================================
  return (
    <>
      {/* カテゴリ別合計サマリー */}
      <div className="border-b border-gray-100 px-6 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          カテゴリ別合計
        </p>
        <div className="space-y-2">
          {sortedCategories.map(([id, cat]) => {
            const pct = totalSeconds > 0 ? (cat.seconds / totalSeconds) * 100 : 0
            return (
              <div key={id} className="flex items-center gap-3">
                {/* カラードット */}
                <div
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getColorBg(cat.color)}`}
                />
                {/* カテゴリ名 */}
                <span className="w-24 flex-shrink-0 truncate text-sm font-semibold text-gray-900">
                  {cat.name}
                </span>
                {/* プログレスバー */}
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getColorBg(cat.color)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* 合計時間 */}
                <span className="w-24 flex-shrink-0 text-right text-sm font-semibold text-blue-700">
                  {formatDuration(cat.seconds)}
                </span>
                {/* パーセント */}
                <span className="w-10 flex-shrink-0 text-right text-xs text-gray-500">
                  {Math.round(pct)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {grouped.map(({ dateKey, entries: dayEntries }) => {
          const dayTotal = dayEntries.reduce((s, e) => s + e.duration_seconds, 0)

          return (
            <div key={dateKey}>
              {/* 日付ヘッダー */}
              <div className="flex items-center justify-between bg-gray-50 px-6 py-2">
                <span className="text-sm font-semibold text-gray-700">
                  {formatDateHeader(dateKey)}
                </span>
                <span className="text-sm font-semibold text-blue-700">
                  合計 {formatDuration(dayTotal)}
                </span>
              </div>

              {/* その日のエントリ */}
              <ul>
                {dayEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-gray-50"
                  >
                    {/* カテゴリカラー */}
                    <div
                      className={`h-3 w-3 flex-shrink-0 rounded-full ${
                        entry.category ? getColorBg(entry.category.color) : 'bg-gray-300'
                      }`}
                    />

                    {/* カテゴリ名 */}
                    <span className="w-28 flex-shrink-0 truncate text-sm font-semibold text-gray-900">
                      {entry.category?.name ?? '不明'}
                    </span>

                    {/* 時間帯 */}
                    <span className="hidden w-32 flex-shrink-0 text-sm text-gray-500 sm:block">
                      {formatTimeRange(entry.started_at, entry.ended_at)}
                    </span>

                    {/* 作業時間 */}
                    <span className="flex-shrink-0 text-sm font-semibold text-blue-700">
                      {formatDuration(entry.duration_seconds)}
                    </span>

                    {/* メモ */}
                    {entry.memo ? (
                      <span className="hidden flex-1 truncate text-sm text-gray-500 sm:block">
                        {entry.memo}
                      </span>
                    ) : (
                      <span className="flex-1" />
                    )}

                    {/* アクション */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(entry)}
                        aria-label="編集"
                        className="rounded-lg p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="削除"
                        className="rounded-lg p-1.5 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* =============================================
          削除確認モーダル
      ============================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-gray-900">記録を削除</h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-900">
                {deleteTarget.category?.name ?? '不明'}（{formatDuration(deleteTarget.duration_seconds)}）
              </span>
              の記録を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-red-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================
          編集モーダル
      ============================================= */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">記録を編集</h2>
              <button
                onClick={closeEdit}
                className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* 日付 */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">日付</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setField('date', e.target.value)}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* 開始 / 終了時刻 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    開始時刻 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={(e) => setField('start_time', e.target.value)}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    終了時刻 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    value={editForm.end_time}
                    onChange={(e) => setField('end_time', e.target.value)}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                </div>
              </div>

              {/* カテゴリ */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  カテゴリ <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setField('category_id', e.target.value)}
                    className="h-12 w-full appearance-none rounded-lg border border-gray-300 px-4 pr-10 text-gray-900 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  >
                    <option value="">カテゴリを選択</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* メモ */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  メモ <span className="text-xs font-normal text-gray-500">（任意）</span>
                </label>
                <input
                  type="text"
                  value={editForm.memo}
                  onChange={(e) => setField('memo', e.target.value)}
                  placeholder="例: デザインレビュー"
                  maxLength={200}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* エラー */}
              {editError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                  {editError}
                </p>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-500 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
