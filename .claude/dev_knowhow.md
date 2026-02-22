# 開発ナレッジ
 
Project Trackerの実装における重要なポイントと、知らないとバグが出やすい箇所をまとめています。
 
## フェーズ1: 基盤構築
 
### 1.1 プロジェクトセットアップ
 
**Tailwind CSS v4の落とし穴**:
- `postcss.config.js`は作成不要（作ると逆にエラー）
- `tailwind.config.ts`のextendは効かない
- カスタムカラーはCSSで定義:
```css
@import "tailwindcss";
@theme {
  --color-primary: #3b82f6;
}
```
 
**Next.js 15のTurbopack**:
- `next dev --turbo`がデフォルト
- 一部のwebpack専用プラグインは動作しない
 
### 1.2 データベース設計
 
**ClerkユーザーIDの型問題（最重要）**:
```sql
-- ❌ 絶対ダメ: UUID型はClerkのIDと互換性なし
clerk_user_id UUID -- エラー: invalid input syntax for type uuid
 
-- ✅ 必須: TEXT型を使用
clerk_user_id TEXT NOT NULL
```
 
**RLSでClerkユーザーID取得の罠**:
```sql
-- ❌ 間違い: auth.uid()は使えない（Supabase Auth未使用のため）
WHERE auth.uid() = clerk_user_id
 
-- ✅ 正解: カスタム関数経由
WHERE get_clerk_user_id() = clerk_user_id
```
 
**get_clerk_user_id()関数の注意点**:
- `SECURITY DEFINER`必須（権限昇格のため）
- EXCEPTION句必須（ヘッダーがない場合のエラー回避）
- 戻り値NULLの場合、RLSは全てブロック
 
### 1.3 Clerk認証設定
 
**Service Role Keyの使い分け（セキュリティ重要）**:
```typescript
// ❌ 危険: クライアントサイドでService Role Key
// app/components/SomeComponent.tsx
const supabase = createClient(url, SERVICE_ROLE_KEY) // 絶対ダメ
 
// ✅ 安全: API RouteでのみService Role Key
// app/api/*/route.ts
const supabase = createClient(url, SERVICE_ROLE_KEY)
```
 
**Middleware設定の落とし穴**:
```typescript
// middleware.ts
export default authMiddleware({
  publicRoutes: ['/'], // ルートは必ず公開
  // ❌ 間違い: '/api'を保護すると全APIが使えない
  // ✅ 正解: '/api/webhooks'など特定のみ公開
})
```
 
### 1.4 Supabase接続設定
 
**ヘッダー設定のタイミング問題**:
```typescript
// ❌ バグ: ヘッダーが効かない
const supabase = createClient(url, key)
supabase.auth.headers = { 'x-clerk-user-id': userId } // 効かない
 
// ✅ 正解: 初期化時に設定
const supabase = createClient(url, key, {
  global: {
    headers: { 'x-clerk-user-id': userId }
  }
})
```
 
## フェーズ2: 基本機能実装
 
### 2.1 レイアウト構築
 
**Header固定時のスクロール問題**:
```css
/* ❌ コンテンツが隠れる */
.header { position: fixed; top: 0; }
.main { margin-top: 0; }
 
/* ✅ ヘッダー分のマージン必須 */
.main { margin-top: 64px; /* ヘッダーの高さ */ }
```
 
**Clerk UserButtonの配置問題**:
- 右寄せにはflexboxが必須
- `afterSignOutUrl`未設定だとエラーページに飛ぶ
 
### 2.2 カテゴリ管理CRUD
 
**削除時の外部キー制約エラー**:
```typescript
// ❌ エラー: foreign key constraint
await supabase.from('categories').delete().eq('id', id)
 
// ✅ 使用チェック必須
const { count } = await supabase
  .from('time_entries')
  .select('*', { count: 'exact', head: true })
  .eq('category_id', id)
 
if (count > 0) {
  return { error: '使用中のカテゴリは削除できません' }
}
```
 
**色選択の同期問題**:
- `defaultValue`だと再レンダリング時に戻る
- `value`と`onChange`でのcontrolled componentが必須
 
## フェーズ3: 時間記録機能
 
### 3.1 タイマー実装
 
**Zustand永続化のハイドレーション問題（重要）**:
```typescript
// ❌ エラー: Hydration mismatch
const time = useTimerStore(state => state.elapsedTime)
return <div>{formatTime(time)}</div>
 
// ✅ 初回レンダリング対策必須
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return <div>00:00:00</div>
```
 
**タイマー精度の問題**:
```typescript
// ❌ 不正確: setIntervalは遅延する
setInterval(() => {
  setElapsedTime(prev => prev + 1000)
}, 1000)
 
// ✅ 正確: 実時間との差分計算
setInterval(() => {
  const now = Date.now()
  const elapsed = now - startTime
  setElapsedTime(elapsed)
}, 100) // 100msで更新頻度UP
```
 
**ページ遷移時のメモリリーク**:
```typescript
// cleanupしないとタイマーが残り続ける
useEffect(() => {
  const interval = setInterval(...)
  return () => clearInterval(interval) // 必須
}, [])
```
 
### 3.2 手動入力機能
 
**数値入力のIME問題**:
```typescript
// ❌ 日本語入力が可能
<input type="number" />
 
// ✅ パターン制限追加
<input 
  type="number" 
  pattern="[0-9]*"
  inputMode="numeric"
/>
```
 
**0時間0分の保存問題**:
```typescript
// バリデーション必須
if (hours === 0 && minutes === 0) {
  return { error: '時間を入力してください' }
}
```
 
## フェーズ4: データ管理と表示
 
### 4.1 作業履歴表示
 
**タイムゾーンのズレ問題（超重要）**:
```typescript
// ❌ バグ: ブラウザとDBで日付がズレる
const date = new Date(entry.start_time)
const dateKey = format(date, 'yyyy-MM-dd') // カナダ時間
 
// ✅ 必須: JST変換
const jstDate = convertToJST(new Date(entry.start_time))
const dateKey = format(jstDate, 'yyyy-MM-dd') // 日本時間
```
 
**削除後の再フェッチ問題**:
```typescript
// ❌ UIが更新されない
await fetch('/api/time-entries/' + id, { method: 'DELETE' })
 
// ✅ 削除後に再フェッチ必須
await fetch('/api/time-entries/' + id, { method: 'DELETE' })
router.refresh() // または fetchEntries()
```
 
### 4.2 統計ダッシュボード
 
**週の開始日問題**:
```typescript
// ❌ 日曜始まり（北米仕様）
startOfWeek(date)
 
// ✅ 月曜始まり（日本仕様）
startOfWeek(date, { weekStartsOn: 1 })
```
 
**リアルタイム更新の不整合**:
- タイマー停止後、統計が即座に反映されない
- `router.refresh()`または手動再フェッチが必要
 
### 4.3 CSVエクスポート
 
**Excel文字化け問題**:
```typescript
// ❌ UTF-8だけだと文字化け
new Blob([csv], { type: 'text/csv' })
 
// ✅ BOM必須
const bom = '\uFEFF'
new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
```
 
**日付フォーマットの罠**:
- Excelは`yyyy/MM/dd`形式を日付として認識
- `yyyy-MM-dd`だと文字列扱い
 
## フェーズ5: プレミアム機能
 
### 5.1 Clerk Billing設定
 
**プラン名の不一致問題**:
```typescript
// ❌ エラー: Clerkに存在しないプラン名
<Protect plan="pro">
 
// ✅ Clerkで設定した正確なプラン名
<Protect plan="premium">
```
 
**PricingTableのSSRエラー**:
```typescript
// ❌ エラー: window is not defined
import { PricingTable } from '@clerk/nextjs'
 
// ✅ Dynamic Import必須
const PricingTable = dynamic(
  () => import('@clerk/nextjs').then(mod => mod.PricingTable),
  { ssr: false, loading: () => <div>Loading...</div> }
)
```
 
### 5.2 高度な分析機能
 
**Rechartsのデータ形式問題**:
```typescript
// ❌ 何も表示されない
data={[
  { name: 'カテゴリA', value: '100' } // 文字列
]}
 
// ✅ 数値型必須
data={[
  { name: 'カテゴリA', value: 100 } // 数値
]}
```
 
**日本語ラベルの改行問題**:
- デフォルトでは日本語ラベルが切れる
- `angle={-45}`や`interval={0}`の調整必要
 
### 5.3 PDFレポート生成
 
**jsPDFの日本語問題を避ける決断**:
- フォント埋め込みでファイルサイズが10MB超に
- 代わりにHTML+印刷ダイアログ方式を採用
 
**印刷ダイアログの自動表示**:
```typescript
// ❌ 表示されない
printWindow.print() // すぐ呼ぶと失敗
 
// ✅ onload後に実行
printWindow.onload = () => {
  printWindow.print()
}
```
 
### 5.4 アクセス制御
 
**has()の非同期問題**:
```typescript
// ❌ サーバーサイドでエラー
const { has } = useAuth() // Clientコンポーネント用
 
// ✅ サーバーサイドでは別関数
import { auth } from '@clerk/nextjs'
const { has } = await auth()
```
 
**カテゴリ上限チェックのタイミング**:
```typescript
// ❌ 作成後にチェック（遅い）
await supabase.from('categories').insert(...)
if (count >= 10) { /* 削除処理 */ }
 
// ✅ 作成前にチェック
const { count } = await supabase.from('categories').select()
if (count >= 10 && !isPremium) {
  return { error: '上限に達しました' }
}
```
 
## 共通のハマりポイント
 
### API Routeのエラーレスポンス
```typescript
// ❌ クライアントでパースエラー
return new Response('エラー', { status: 400 })
 
// ✅ 必ずJSON形式
return NextResponse.json(
  { error: 'エラーメッセージ' },
  { status: 400 }
)
```
 
### useEffectの依存配列
```typescript
// ❌ 無限ループ
useEffect(() => {
  fetchData()
}, [data]) // dataが更新されると再実行
 
// ✅ 初回のみ
useEffect(() => {
  fetchData()
}, [])
```
 
### Supabaseのnull値
```typescript
// ❌ TypeScriptエラー
const name: string = data.name // possibly null
 
// ✅ null合体演算子
const name: string = data.name ?? ''
```
 
### 日付の扱い
- DBはUTC保存
- 表示は必ずJST変換
- 入力もJST→UTC変換してから保存