'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const DynamicSignUp = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignUp),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
    ),
  }
)

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">アカウント作成</h1>
          <p className="mt-2 text-gray-600">Project Tracker で時間を管理しよう</p>
        </div>

        <DynamicSignUp />

        <p className="mt-6 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{' '}
          <Link
            href="/sign-in"
            className="font-semibold text-blue-700 hover:text-blue-800 transition-colors duration-200"
          >
            サインイン
          </Link>
        </p>
      </div>
    </div>
  )
}
