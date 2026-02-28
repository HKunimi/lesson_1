'use client'

import dynamic from 'next/dynamic'

const PricingTable = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.PricingTable),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="mx-auto h-96 max-w-2xl rounded-2xl bg-gray-100" />
      </div>
    ),
  }
)

export function DynamicPricingTable() {
  return <PricingTable />
}
