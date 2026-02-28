'use client'

import { useEffect, useState, useRef } from 'react'
import { Sparkles, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react'

// ── 型定義 ─────────────────────────────────────────────────────────────────

interface PeriodStats {
  total_seconds: number
  entry_count:   number
  active_days:   number
}

interface CategoryStat {
  id:      string
  name:    string
  color:   string
  seconds: number
}

interface HourlyStat {
  hour:    number
  seconds: number
}

interface InsightsResult {
  score:      number
  grade:      string
  summary:    string
  insights:   string[]
  suggestion: string
}

interface Props {
  tab:                string
  label:              string
  daysInPeriod:       number
  current:            PeriodStats
  previous:           PeriodStats
  category_breakdown: CategoryStat[]
  hourly_breakdown:   HourlyStat[]
}

// ── スコアリングUI ──────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius      = 44
  const stroke      = 7
  const normalizedR = radius - stroke / 2
  const circumf     = 2 * Math.PI * normalizedR
  const offset      = circumf * (1 - score / 100)

  const color =
    score >= 80 ? '#22C55E' :
    score >= 60 ? '#3B82F6' :
    score >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90" width={radius * 2} height={radius * 2}>
        {/* 背景トラック */}
        <circle
          cx={radius} cy={radius} r={normalizedR}
          fill="none" stroke="#E5E7EB" strokeWidth={stroke}
        />
        {/* スコア円弧 */}
        <circle
          cx={radius} cy={radius} r={normalizedR}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumf}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-xs font-semibold text-gray-500">/ 100</span>
      </div>
    </div>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    S: 'bg-purple-100 text-purple-700 border-purple-300',
    A: 'bg-green-100  text-green-700  border-green-300',
    B: 'bg-blue-100   text-blue-700   border-blue-300',
    C: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    D: 'bg-orange-100 text-orange-700 border-orange-300',
    E: 'bg-red-100    text-red-700    border-red-300',
  }
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold ${colors[grade] ?? colors.E}`}>
      {grade}
    </span>
  )
}

// ── スケルトン ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

// ── メインコンポーネント ────────────────────────────────────────────────────

export function InsightsSummary({
  tab, label, daysInPeriod, current, previous,
  category_breakdown, hourly_breakdown,
}: Props) {
  const [result,  setResult]  = useState<InsightsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // 同じ期間を二重fetchしないようにキャッシュ
  const cacheKey = useRef<string>('')

  async function fetchInsights(force = false) {
    const key = `${tab}:${label}:${current.total_seconds}`
    if (!force && cacheKey.current === key && result) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tab, label, daysInPeriod, current, previous,
          category_breakdown, hourly_breakdown,
        }),
      })
      const data = await res.json() as InsightsResult & { error?: { message: string } }
      if (data.error) throw new Error(data.error.message)
      cacheKey.current = key
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // データが揃ったら自動取得
  useEffect(() => {
    if (current.total_seconds === 0 && current.entry_count === 0) return
    fetchInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, label])

  // ── データなし ──
  if (current.total_seconds === 0 && current.entry_count === 0) {
    return (
      <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">AI 生産性サマリー</span>
        </div>
        <p className="text-sm text-gray-400">この期間の作業記録がありません。</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md">

      {/* ヘッダー */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">AI 生産性サマリー</span>
        </div>
        {!loading && result && (
          <button
            onClick={() => fetchInsights(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-all duration-200 hover:border-gray-300 hover:text-gray-700"
          >
            <RefreshCw className="h-3 w-3" />
            再生成
          </button>
        )}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      )}

      {/* エラー */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 結果 */}
      {!loading && result && (
        <div className="space-y-5">

          {/* スコア + サマリー */}
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ScoreRing score={result.score} />
              <GradeBadge grade={result.grade} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">総合評価</p>
              <p className="text-sm leading-relaxed text-gray-800">{result.summary}</p>
            </div>
          </div>

          {/* インサイト */}
          {result.insights.length > 0 && (
            <div className="rounded-xl bg-blue-50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">気づき</span>
              </div>
              {result.insights.map((insight, i) => (
                <p key={i} className="text-sm text-blue-800 leading-relaxed">
                  • {insight}
                </p>
              ))}
            </div>
          )}

          {/* サジェスト */}
          {result.suggestion && (
            <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <p className="text-sm text-gray-700 leading-relaxed">{result.suggestion}</p>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
