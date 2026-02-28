import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { DynamicPricingTable } from '@/components/pricing/DynamicPricingTable'

export const metadata = {
  title: '料金プラン | Project Tracker',
  description: 'シンプルで分かりやすい料金体系。無料プランからプレミアムプランまで。',
}

// 無料プランの機能
const FREE_FEATURES = [
  { label: '作業時間の記録（タイマー・手動入力）', included: true },
  { label: 'カテゴリ管理（最大5件）', included: true },
  { label: '今日・今週・今月の合計時間', included: true },
  { label: '作業履歴の閲覧', included: true },
  { label: 'CSVエクスポート', included: true },
  { label: '日次・週次・月次・年次の詳細分析', included: false },
  { label: 'カテゴリ別グラフ（円・棒・ヒートマップ）', included: false },
  { label: '生産性指標・トレンド分析', included: false },
  { label: 'カテゴリ無制限作成', included: false },
  { label: 'PDFレポート生成', included: false },
]

// プレミアムプランの機能
const PREMIUM_FEATURES = [
  { label: '作業時間の記録（タイマー・手動入力）', included: true },
  { label: 'カテゴリ管理（無制限）', included: true },
  { label: '今日・今週・今月の合計時間', included: true },
  { label: '作業履歴の閲覧', included: true },
  { label: 'CSVエクスポート', included: true },
  { label: '日次・週次・月次・年次の詳細分析', included: true },
  { label: 'カテゴリ別グラフ（円・棒・ヒートマップ）', included: true },
  { label: '生産性指標・トレンド分析', included: true },
  { label: 'カテゴリ無制限作成', included: true },
  { label: 'PDFレポート生成', included: true },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ヒーロー */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          シンプルな料金プラン
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          まずは無料で始めて、必要になったらアップグレード
        </p>
      </div>

      {/* プラン比較カード */}
      <div className="mb-16 grid gap-6 sm:grid-cols-2">
        {/* 無料プラン */}
        <div className="rounded-2xl border border-gray-300 bg-white p-8 shadow-md">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">無料プラン</h2>
            <p className="mt-1 text-sm text-gray-600">基本的な時間管理に</p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="ml-1 text-sm text-gray-500">/月</span>
            </div>
          </div>
          <Link
            href="/sign-up"
            className="mb-6 block rounded-xl border-2 border-gray-300 py-3 text-center text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400 hover:shadow-md"
          >
            無料で始める
          </Link>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                {f.included ? (
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300" />
                )}
                <span
                  className={`text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* プレミアムプラン */}
        <div className="rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-lg">
          <div className="mb-2 inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
            おすすめ
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">プレミアムプラン</h2>
            <p className="mt-1 text-sm text-gray-600">本格的な生産性向上に</p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">$10</span>
              <span className="ml-1 text-sm text-gray-500">/月</span>
            </div>
          </div>
          <Link
            href="/sign-up"
            className="mb-6 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg"
          >
            プレミアムで始める
          </Link>
          <ul className="space-y-3">
            {PREMIUM_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-sm text-gray-700">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Clerk PricingTable */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
          プランを選択して始める
        </h2>
        <DynamicPricingTable />
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-gray-300 bg-white p-8 shadow-md">
        <h2 className="mb-6 text-xl font-bold text-gray-900">よくある質問</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900">
              無料プランからプレミアムにいつでも変更できますか？
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              はい、いつでもアップグレードできます。アップグレード後すぐにプレミアム機能をご利用いただけます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              支払い方法はどのようなものがありますか？
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Stripe経由でクレジットカード（Visa、Mastercard、American Expressなど）でのお支払いが可能です。
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              解約はいつでもできますか？
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              はい、いつでも解約できます。解約後も有効期間が終わるまでプレミアム機能をご利用いただけます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              無料プランのデータはアップグレード後も引き継がれますか？
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              はい、すべてのデータはそのまま引き継がれます。アップグレード後は過去のデータも詳細分析できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
