'use client'

import { Protect } from '@clerk/nextjs'
import { Lock, BarChart2, PieChart, TrendingUp, FileText } from 'lucide-react'
import Link from 'next/link'

interface PlanProtectProps {
  children: React.ReactNode
}

// アップグレード促進UI
function UpgradePrompt() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      {/* ロックアイコン */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-sm">
          <Lock className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <h2 className="mb-2 text-2xl font-bold text-gray-900">
        プレミアム機能です
      </h2>
      <p className="mb-8 text-gray-600">
        詳細な分析レポートはプレミアムプランでご利用いただけます。
      </p>

      {/* プレミアム機能リスト */}
      <div className="mb-8 rounded-2xl border border-gray-300 bg-white p-6 shadow-md text-left">
        <p className="mb-4 text-sm font-semibold text-gray-700">
          プレミアムプランで使える機能
        </p>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <BarChart2 className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm text-gray-700">
              日次・週次・月次・年次の期間切り替え分析
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <PieChart className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm text-gray-700">
              カテゴリ別グラフ（円グラフ・棒グラフ・ヒートマップ）
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm text-gray-700">
              生産性指標・過去データとのトレンド比較
            </span>
          </li>
          <li className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm text-gray-700">
              PDFレポート生成・カテゴリ無制限
            </span>
          </li>
        </ul>
      </div>

      {/* 価格 */}
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">$10</span>
        <span className="ml-1 text-gray-500">/月</span>
      </div>

      {/* アップグレードボタン */}
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-8 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg active:scale-95"
      >
        プレミアムにアップグレード
      </Link>

      <p className="mt-4 text-xs text-gray-500">
        いつでもキャンセル可能・クレジットカード不要でお試し
      </p>
    </div>
  )
}

export function PlanProtect({ children }: PlanProtectProps) {
  return (
    <Protect plan="premium" fallback={<UpgradePrompt />}>
      {children}
    </Protect>
  )
}
