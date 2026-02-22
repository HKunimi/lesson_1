import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { TimeEntryInsert } from '@/types'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error'
}

// GET /api/time-entries
// クエリパラメータ: from (ISO), to (ISO), limit (number, default 50)
export async function GET(request: Request) {
  try {
    const { supabase } = await createAuthenticatedSupabaseClient()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

    let query = supabase
      .from('time_entries')
      .select('*, category:categories(*)')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('started_at', from)
    if (to) query = query.lte('started_at', to)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}

// POST /api/time-entries
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const body = await request.json()

    if (!body.category_id) {
      return NextResponse.json(
        { data: null, error: { message: 'カテゴリを選択してください' } },
        { status: 400 }
      )
    }

    if (!body.started_at || !body.ended_at) {
      return NextResponse.json(
        { data: null, error: { message: '開始・終了時刻は必須です' } },
        { status: 400 }
      )
    }

    if (!body.duration_seconds || body.duration_seconds < 1) {
      return NextResponse.json(
        { data: null, error: { message: '1秒以上計測してください' } },
        { status: 400 }
      )
    }

    const insert: TimeEntryInsert = {
      user_id: userId,
      category_id: body.category_id,
      started_at: body.started_at,
      ended_at: body.ended_at,
      duration_seconds: body.duration_seconds,
      memo: body.memo ?? null,
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert(insert)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
