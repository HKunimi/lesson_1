'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Star, X, Check } from 'lucide-react'
import { Category } from '@/types'

// 選択可能なカラー一覧
const COLOR_OPTIONS = [
  { value: 'red-500',    bg: 'bg-red-500' },
  { value: 'orange-500', bg: 'bg-orange-500' },
  { value: 'amber-500',  bg: 'bg-amber-500' },
  { value: 'yellow-500', bg: 'bg-yellow-500' },
  { value: 'lime-500',   bg: 'bg-lime-500' },
  { value: 'green-500',  bg: 'bg-green-500' },
  { value: 'teal-500',   bg: 'bg-teal-500' },
  { value: 'cyan-500',   bg: 'bg-cyan-500' },
  { value: 'blue-500',   bg: 'bg-blue-500' },
  { value: 'indigo-500', bg: 'bg-indigo-500' },
  { value: 'violet-500', bg: 'bg-violet-500' },
  { value: 'purple-500', bg: 'bg-purple-500' },
  { value: 'pink-500',   bg: 'bg-pink-500' },
  { value: 'rose-500',   bg: 'bg-rose-500' },
]

function getColorBg(color: string) {
  return COLOR_OPTIONS.find((c) => c.value === color)?.bg ?? 'bg-blue-500'
}

type ModalMode = 'create' | 'edit'

interface CategoryFormState {
  name: string
  color: string
  is_favorite: boolean
}

const DEFAULT_FORM: CategoryFormState = {
  name: '',
  color: 'blue-500',
  is_favorite: false,
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // モーダル
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  // カテゴリ取得
  async function fetchCategories() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/categories')
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setCategories(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // モーダルを開く
  function openCreate() {
    setModalMode('create')
    setEditTarget(null)
    setForm(DEFAULT_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setModalMode('edit')
    setEditTarget(cat)
    setForm({ name: cat.name, color: cat.color, is_favorite: cat.is_favorite })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setFormError(null)
  }

  // 保存
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('カテゴリ名を入力してください')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const url =
        modalMode === 'create' ? '/api/categories' : `/api/categories/${editTarget!.id}`
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      await fetchCategories()
      closeModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  // お気に入りトグル
  async function toggleFavorite(cat: Category) {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !cat.is_favorite }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_favorite: !c.is_favorite } : c))
      )
    } catch {
      // silent
    }
  }

  // 削除
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カテゴリ管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            プロジェクトやタスクのカテゴリを管理します
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg active:scale-95"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </button>
      </div>

      {/* ステート */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-md">
          <p className="font-semibold text-red-600">{error}</p>
          <button
            onClick={fetchCategories}
            className="mt-3 rounded-xl border-2 border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-50"
          >
            再読み込み
          </button>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="rounded-2xl border border-gray-300 bg-white p-16 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-300 bg-gray-50 shadow-sm">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <p className="mb-1 font-semibold text-gray-700">カテゴリがありません</p>
          <p className="mb-6 text-sm text-gray-500">
            最初のカテゴリを作成して作業時間を整理しましょう
          </p>
          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg"
          >
            カテゴリを作成する
          </button>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-300 bg-white p-5 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg"
            >
              {/* カラードット */}
              <div
                className={`h-5 w-5 flex-shrink-0 rounded-full shadow-sm ${getColorBg(cat.color)}`}
              />

              {/* 名前 */}
              <span className="flex-1 font-semibold text-gray-900">{cat.name}</span>

              {/* アクション */}
              <div className="flex items-center gap-1">
                {/* お気に入り */}
                <button
                  onClick={() => toggleFavorite(cat)}
                  aria-label={cat.is_favorite ? 'お気に入り解除' : 'お気に入りに追加'}
                  className={`rounded-lg p-2 transition-all duration-200 hover:bg-gray-100 ${
                    cat.is_favorite ? 'text-amber-500' : 'text-gray-400'
                  }`}
                >
                  <Star className="h-5 w-5" fill={cat.is_favorite ? 'currentColor' : 'none'} />
                </button>

                {/* 編集 */}
                <button
                  onClick={() => openEdit(cat)}
                  aria-label="編集"
                  className="rounded-lg p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Pencil className="h-5 w-5" />
                </button>

                {/* 削除 */}
                <button
                  onClick={() => setDeleteTarget(cat)}
                  aria-label="削除"
                  className="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 作成・編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'カテゴリを作成' : 'カテゴリを編集'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* カテゴリ名 */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  カテゴリ名 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: デザイン作業"
                  maxLength={50}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
              </div>

              {/* カラー選択 */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  カラー
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      className={`relative h-8 w-8 rounded-full shadow-sm transition-all duration-200 hover:scale-110 ${c.bg}`}
                      aria-label={c.value}
                    >
                      {form.color === c.value && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* お気に入り */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.is_favorite}
                  onChange={(e) => setForm((f) => ({ ...f, is_favorite: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  お気に入りに追加
                </span>
              </label>

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
                  {submitting ? '保存中...' : modalMode === 'create' ? '作成する' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-gray-900">カテゴリを削除</h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-900">「{deleteTarget.name}」</span>
              を削除しますか？この操作は取り消せません。
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
    </div>
  )
}
