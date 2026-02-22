'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { extendedJaJP } from '@/locales/extended_ja_jp'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={extendedJaJP}>
      {children}
    </ClerkProvider>
  )
}
