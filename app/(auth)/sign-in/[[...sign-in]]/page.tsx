'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const DynamicSignIn = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignIn),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
    ),
  }
)

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">おかえりなさい</h1>
          <p className="mt-2 text-gray-600">Project Tracker にサインイン</p>
        </div>

        <DynamicSignIn />

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <Link
            href="/sign-up"
            className="font-semibold text-blue-700 hover:text-blue-800 transition-colors duration-200"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
}
