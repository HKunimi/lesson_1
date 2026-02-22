import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { TimeEntryUpdate } from '@/types'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error'
}

// PUT /api/time-entries/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const { id } = await params
    const body = await request.json()

    const update: TimeEntryUpdate = {}
    if (body.category_id !== undefined) update.category_id = body.category_id
    if (body.started_at !== undefined) update.started_at = body.started_at
    if (body.ended_at !== undefined) update.ended_at = body.ended_at
    if (body.duration_seconds !== undefined) update.duration_seconds = body.duration_seconds
    if (body.memo !== undefined) update.memo = body.memo

    // 開始・終了時刻が両方指定された場合に duration_seconds を自動計算
    if (update.started_at && update.ended_at && update.duration_seconds === undefined) {
      const diff = Math.floor(
        (new Date(update.ended_at).getTime() - new Date(update.started_at).getTime()) / 1000
      )
      if (diff <= 0) {
        return NextResponse.json(
          { data: null, error: { message: '終了時刻は開始時刻より後にしてください' } },
          { status: 400 }
        )
      }
      update.duration_seconds = diff
    }

    if (
      update.duration_seconds !== undefined &&
      update.duration_seconds < 1
    ) {
      return NextResponse.json(
        { data: null, error: { message: '作業時間は1秒以上にしてください' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, category:categories(*)')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}

// DELETE /api/time-entries/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const { id } = await params

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ data: null, error: null })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}
