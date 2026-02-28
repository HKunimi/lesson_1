import { PlanProtect } from '@/components/PlanProtect'
import { PeriodReportView } from '@/components/report/PeriodReportView'
import { Crown } from 'lucide-react'

export const metadata = {
  title: 'レポート | Project Tracker',
  description: '詳細な作業時間分析レポート（プレミアム機能）',
}

export default function ReportPage() {
  return (
    <PlanProtect>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ページタイトル */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
            <Crown className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">分析レポート</h1>
            <p className="mt-0.5 text-sm text-gray-600">
              詳細な作業時間の分析と生産性指標
            </p>
          </div>
        </div>

        <PeriodReportView />
      </div>
    </PlanProtect>
  )
}
