# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured yet.

## Project

**Project Tracker** — 作業時間計測アプリ。タイマー計測・手動入力・カテゴリ管理・分析レポート機能を持つ。

- 要件定義: `.claude/requirements.md`
- 開発ロードマップ: `.claude/development_roadmap.md`

## Architecture

**Next.js 16** / App Router / **TypeScript** / **Tailwind CSS v4** / **React 19**

`@/*` path alias maps to the project root.

### Planned Route Structure

```
app/
├── page.tsx                  # トップページ（サービス紹介・CTA）
├── layout.tsx                # Root layout
├── globals.css               # Tailwind base styles
├── (auth)/
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── dashboard/page.tsx        # タイマー・作業履歴（認証必須）
├── categories/page.tsx       # カテゴリ管理（認証必須）
├── report/page.tsx           # 分析レポート（プレミアム限定）
├── pricing/page.tsx          # 料金ページ（Clerk PricingTable）
├── user-setting/page.tsx     # アカウント設定
└── api/
    ├── categories/           # CRUD
    ├── time-entries/         # CRUD
    └── insights/             # Claude APIを呼び出すAIインサイト生成
```

### Planned Database Schema（Supabase）

- `categories` — ユーザーが作成するカテゴリ（名前・色・お気に入りフラグ）
- `time_entries` — 作業ログ（開始/終了時刻・duration・category_id・メモ）

タイマーの実行中状態は `localStorage` で管理し、ページリロード後も継続できるようにする。

## Environment Variables

`.env.local` で管理：

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ANTHROPIC_API_KEY          # AIインサイト機能（Claude API）で使用
```

## Next.js 16 の注意事項

- **`middleware.ts` は廃止** — Next.js 16 では `proxy.ts` を使用する
- Clerk の `clerkMiddleware` は `proxy.ts` に記述する

## Clerk（認証・課金）

Clerkを使った認証、サブスクリプション管理、課金機能の実装は `.claude/clerk_document.md` を参照すること。

- 認証（サインアップ/サインイン）、プラン別アクセス制御、料金ページなどすべてClerkで実装する
- 課金は **Clerk Billing**（Stripeベース）を使用する
- プレミアム判定は `has({ plan: 'premium' })` で行う（Clerkダッシュボードでスラグを `premium` に設定）
- SupabaseとのRLS連携については下記「Clerk × Supabase 連携」セクションを参照

## Supabase

Supabaseに関する実装は `.claude/supabase_document.md` を参照すること。

- 開発環境は**方法1（クラウドベース）**を使用する — Dockerは使用しない
- データベース設計・CRUD操作・RLS・リアルタイム機能などの詳細はすべて上記ドキュメントに従うこと
- usersテーブルが必要な場合はClerk Webhookを使わず、初回データ登録時に作成する

## Clerk × Supabase 連携

ClerkとSupabaseを組み合わせる場合（RLS連携・ユーザーID管理など）は `.claude/clerk_supabase_integration.md` を参照すること。

## Tailwind CSS

Tailwind CSS v4のセットアップ・設定方法は `.claude/tailwind_document.md` を参照すること。

## Design

All UI implementation must follow the design system defined in `.claude/design_system.md`. Key rules:

- Use **Tailwind CSS utility classes only** — no custom CSS for colors
- Primary color: `blue-500` / hover: `blue-600` / text on white: `blue-700` or darker
- Text colors: `gray-900` (main), `gray-700` (sub), `gray-600` (caption)
- Border radius: `rounded-lg` (inputs/small buttons), `rounded-xl` (standard buttons), `rounded-2xl` (cards), `rounded-3xl` (modals)
- All interactive elements must have a shadow; hover states must strengthen the shadow
- Minimum touch target: 44px × 44px
- Button text: `font-semibold` or heavier
- Cards: `bg-white border border-gray-300 shadow-md rounded-2xl`
- Transitions: `transition-all duration-200 ease-in-out`
- WCAG 2.1 contrast compliance required (4.5:1 for normal text, 3:1 for large text)
