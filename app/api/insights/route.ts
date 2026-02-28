import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ── 型定義 ──────────────────────────────────────────────────────────────────

interface PeriodStats {
  total_seconds: number
  entry_count:   number
  active_days:   number
}

interface CategoryStat {
  id:      string
  name:    string
  color:   string
  seconds: number
}

interface HourlyStat {
  hour:    number
  seconds: number
}

interface InsightsRequest {
  tab:                string
  label:              string
  daysInPeriod:       number
  current:            PeriodStats
  previous:           PeriodStats
  category_breakdown: CategoryStat[]
  hourly_breakdown:   HourlyStat[]
}

// ── スコア計算（アルゴリズム） ──────────────────────────────────────────────

/**
 * 生産性スコア (0–100) を算出する。
 *
 * 3軸で評価:
 *   1. アクティブ日率 (active_days / daysInPeriod)          … 35pt
 *   2. 1日平均作業量 (目安: 6時間/日 を上限100%として)        … 35pt
 *   3. 前期間比      (前期間比 1.0 → 50pt, 1.2以上 → 満点)  … 30pt
 */
function computeScore(
  current:      PeriodStats,
  previous:     PeriodStats,
  daysInPeriod: number,
): number {
  // 1. アクティブ日率
  const activeDayRatio = daysInPeriod > 0 ? current.active_days / daysInPeriod : 0
  const activeScore    = Math.min(activeDayRatio, 1) * 35

  // 2. 1日平均作業量（6h/day = 21600秒 を 100% とする）
  const TARGET_SEC_PER_DAY = 6 * 3600
  const avgSecPerDay       = daysInPeriod > 0 ? current.total_seconds / daysInPeriod : 0
  const avgScore           = Math.min(avgSecPerDay / TARGET_SEC_PER_DAY, 1) * 35

  // 3. 前期間比
  let prevScore: number
  if (previous.total_seconds === 0) {
    // 前期間データなし → 中立点 (15/30)
    prevScore = 15
  } else {
    const ratio = current.total_seconds / previous.total_seconds
    // 0.8 以下 → 0pt、1.0 → 15pt、1.2 以上 → 30pt（線形補間）
    prevScore = Math.min(Math.max((ratio - 0.8) / 0.4, 0), 1) * 30
  }

  return Math.round(activeScore + avgScore + prevScore)
}

function scoreGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'E'
}

// ── Claude API でテキストインサイトを生成 ──────────────────────────────────

async function generateInsights(req: InsightsRequest, score: number): Promise<{
  summary:    string
  insights:   string[]
  suggestion: string
}> {
  const client = new Anthropic()

  const topCats = req.category_breakdown
    .slice(0, 3)
    .map((c) => {
      const h = Math.floor(c.seconds / 3600)
      const m = Math.floor((c.seconds % 3600) / 60)
      return `${c.name}: ${h}時間${String(m).padStart(2, '0')}分`
    })
    .join('、')

  const peakHour = req.hourly_breakdown.reduce(
    (max, h) => (h.seconds > max.seconds ? h : max),
    { hour: -1, seconds: 0 },
  )
  const peakStr = peakHour.hour >= 0 && peakHour.seconds > 0
    ? `${String(peakHour.hour).padStart(2, '0')}時台`
    : 'データなし'

  const totalH   = Math.floor(req.current.total_seconds / 3600)
  const totalM   = Math.floor((req.current.total_seconds % 3600) / 60)
  const prevH    = Math.floor(req.previous.total_seconds / 3600)
  const prevM    = Math.floor((req.previous.total_seconds % 3600) / 60)
  const changePct = req.previous.total_seconds > 0
    ? (((req.current.total_seconds - req.previous.total_seconds) / req.previous.total_seconds) * 100).toFixed(1)
    : null

  const prompt = `あなたは生産性コーチです。ユーザーの作業時間データを分析し、建設的で具体的なフィードバックを日本語で提供してください。

## 対象期間
${req.label}（${req.tab === 'daily' ? '日次' : req.tab === 'weekly' ? '週次' : req.tab === 'monthly' ? '月次' : '年次'}）

## データ
- 作業時間合計: ${totalH}時間${String(totalM).padStart(2, '0')}分
- セッション数: ${req.current.entry_count}件
- アクティブ日数: ${req.current.active_days}日 / ${req.daysInPeriod}日
- 前期間: ${prevH}時間${String(prevM).padStart(2, '0')}分${changePct ? `（${Number(changePct) >= 0 ? '+' : ''}${changePct}%）` : '（前期間データなし）'}
- カテゴリ内訳: ${topCats || 'データなし'}
- ピーク作業時間帯: ${peakStr}
- 生産性スコア: ${score}点 / 100点

## 回答フォーマット（JSON のみ返してください）
{
  "summary": "期間全体の作業傾向を1〜2文で総括するコメント（ポジティブな表現を心がける）",
  "insights": [
    "データから読み取れる具体的な気づき（最大2件）"
  ],
  "suggestion": "次の期間に向けた実践的なアドバイスを1文で"
}`

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // JSONブロック抽出（マークダウンのコードフェンス対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      summary:    'データを分析しました。',
      insights:   [],
      suggestion: '継続的な記録を心がけましょう。',
    }
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary:    string
    insights:   string | string[]
    suggestion: string
  }

  return {
    summary:    parsed.summary    ?? '',
    insights:   Array.isArray(parsed.insights) ? parsed.insights : [],
    suggestion: parsed.suggestion ?? '',
  }
}

// ── POST /api/insights ────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InsightsRequest

    const score  = computeScore(body.current, body.previous, body.daysInPeriod)
    const grade  = scoreGrade(score)
    const texts  = await generateInsights(body, score)

    return NextResponse.json({ score, grade, ...texts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
