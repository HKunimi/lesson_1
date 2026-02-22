'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Clock } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/categories', label: 'カテゴリ' },
  { href: '/report', label: 'レポート' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ロゴ */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-md">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Project Tracker</span>
        </Link>

        {/* 右側 */}
        <div className="flex items-center gap-4">
          {/* 認証済み：ナビゲーション + UserButton */}
          <SignedIn>
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* 未認証：サインイン・サインアップボタン */}
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-700 transition-all duration-200 hover:bg-gray-100"
            >
              サインイン
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-600 hover:shadow-lg"
            >
              無料で始める
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
