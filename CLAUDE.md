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

### Route Structure（実装済み）

```
app/
├── layout.tsx                        # Root layout（ClerkProvider wrapping）
├── providers.tsx                     # 'use client' — ClerkProvider + 日本語ローカライズ
├── globals.css                       # Tailwind base styles
├── (auth)/                           # 認証不要グループ（Headerなし）
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (main)/                           # 認証必須グループ（Header付き）
│   ├── layout.tsx                    # Header + <main> ラッパー
│   ├── page.tsx                      # トップページ（サービス紹介・CTA）
│   ├── dashboard/page.tsx            # Server Component — タイマー・統計・作業履歴
│   └── categories/page.tsx           # Client Component — カテゴリCRUD
└── api/
    ├── categories/route.ts           # GET, POST
    ├── categories/[id]/route.ts      # PUT, DELETE
    ├── time-entries/route.ts         # GET（日付フィルタ・limit対応）, POST
    └── time-entries/[id]/route.ts    # PUT, DELETE
```

### Key Files

| ファイル | 役割 |
|---|---|
| `proxy.ts` | Clerk middleware（Next.js 16では `middleware.ts` でなく `proxy.ts`） |
| `lib/supabase-auth.ts` | `createAuthenticatedSupabaseClient()` — API Route専用、Clerk userIdをヘッダーに付与 |
| `lib/supabase.ts` | 基本Supabaseクライアント（認証不要操作用） |
| `lib/use-timer.ts` | タイマーカスタムフック + `formatSeconds()` — localStorageで状態永続化 |
| `types/index.ts` | 全型定義（User, Category, TimeEntry, TimerState等） |
| `components/Header.tsx` | 'use client' — ナビゲーション、SignedIn/SignedOut切り替え |
| `components/TimerSection.tsx` | 'use client' — タイマーUI（開始/一時停止/再開/停止・保存、カテゴリ選択、メモ） |
| `components/ManualEntryModal.tsx` | 'use client' — 手動時間記録モーダル（2モード：開始〜終了時刻/時間直接入力） |

### Database Schema（Supabase）

- `users` — Clerk userID (TEXT PK)、email、timezone、week_start
- `categories` — name、color（Tailwind色名例: `blue-500`）、is_favorite、user_id FK
- `time_entries` — started_at、ended_at、duration_seconds、memo、category_id FK、user_id FK

**初回データ登録時のユーザー作成**: Webhookは使わず、`POST /api/categories` で `currentUser()` を使いupsert。

### Authentication & RLS

Clerk × Supabase 連携は **カスタムヘッダー方式**:
- API Route で `createAuthenticatedSupabaseClient()` が `x-clerk-user-id: userId` ヘッダーを付与
- Supabase の `get_clerk_user_id()` 関数がそのヘッダーを読んでRLSポリシーで使用
- 全APIルートで `user_id` チェックを実施 — 他ユーザーのデータには一切アクセス不可

### Timer State（localStorage）

`TimerState` を `project_tracker_timer` キーで localStorage に保存。ページ遷移・リロード後も継続。

```typescript
type TimerState = {
  status: 'idle' | 'running' | 'paused'
  category_id: string | null
  started_at: string | null   // セッション最初の開始時刻（DBのstarted_atに使用）
  resumed_at: string | null   // 現セグメント開始時刻（経過計算に使用）
  paused_at: string | null
  elapsed_seconds: number     // 過去セグメントの累計秒数
}
```

現在の経過秒 = `elapsed_seconds + (now - resumed_at)` （running時）

### API Response Format

全APIルートで統一:
```json
{ "data": <T | null>, "error": <{ "message": string } | null> }
```

エラーハンドリングは `getErrorMessage(error)` ヘルパーを各ルートに定義 — `PostgrestError`（Supabase）は `instanceof Error` が false になるため専用処理が必要。

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
- Server Component で `ssr: false` は使えない — `'use client'` + `dynamic()` を使う

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
- **動的なTailwindクラス**（`bg-${color}` など）は使用禁止 — カラーマップを Record で定義して使う
