import Link from 'next/link'
import { Clock, BarChart2, Tag, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Clock,
    title: 'タイマー計測',
    description:
      'ワンクリックで計測開始。ページをまたいでもタイマーは継続します。手動入力にも対応。',
  },
  {
    icon: Tag,
    title: 'カテゴリ管理',
    description:
      'プロジェクトやタスクをカテゴリで整理。色分けでひと目で把握できます。',
  },
  {
    icon: BarChart2,
    title: '時間の可視化',
    description:
      '今日・今週・今月の作業時間を自動集計。プレミアムでは詳細グラフ分析も。',
  },
]

const freeFeatures = [
  'タイマー計測・手動入力',
  'カテゴリ管理',
  '日・週・月の合計時間表示',
  '作業履歴の閲覧',
  'CSVエクスポート',
]

const premiumFeatures = [
  '日次・週次・月次・年次の詳細分析',
  'カテゴリ別グラフ（円・棒・ヒートマップ）',
  '前期間との比較・トレンド分析',
  '生産性指標の分析',
  'PDFレポート生成',
  '無料プランの全機能',
]

export default function TopPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      {/* ヒーローセクション */}
      <section className="py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
          <span className="text-sm font-semibold text-blue-700">
            シンプルな作業時間管理
          </span>
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
          時間を見える化して、
          <br />
          <span className="text-blue-500">生産性を向上</span>させる
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-600">
          タイマー計測・手動入力・カテゴリ管理。シンプルな操作で作業時間を記録し、
          時間の使い方を分析できる時間管理アプリです。
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 rounded-2xl bg-blue-500 px-8 py-4 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg active:scale-95"
          >
            無料で始める
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="rounded-2xl border-2 border-blue-700 px-8 py-4 text-base font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:shadow-md"
          >
            サインイン
          </Link>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16">
        <h2 className="mb-12 text-center text-2xl font-semibold text-gray-900">
          3つの主要機能
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:border-gray-400 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 shadow-md">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 料金プラン */}
      <section className="py-16">
        <h2 className="mb-4 text-center text-2xl font-semibold text-gray-900">
          シンプルな料金プラン
        </h2>
        <p className="mb-12 text-center text-gray-600">
          まずは無料で始めて、必要に応じてアップグレード
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 無料プラン */}
          <div className="rounded-2xl border border-gray-300 bg-white p-8 shadow-md">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">無料プラン</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/月</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-sm text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block w-full rounded-xl border-2 border-blue-700 py-3 text-center font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:shadow-md"
            >
              無料で始める
            </Link>
          </div>

          {/* プレミアムプラン */}
          <div className="rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-lg">
            <div className="mb-2 inline-flex rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              おすすめ
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                プレミアムプラン
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$10</span>
                <span className="text-gray-600">/月</span>
              </div>
            </div>
            <ul className="mb-8 space-y-3">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span className="text-sm text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg"
            >
              プレミアムを見る
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-gray-200 py-8 text-center">
        <p className="text-sm text-gray-500">
          © 2026 Project Tracker. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
