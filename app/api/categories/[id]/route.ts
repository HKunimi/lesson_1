import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { CategoryUpdate } from '@/types'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error'
}

// PUT /api/categories/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const { id } = await params
    const body = await request.json()

    const update: CategoryUpdate = {}
    if (body.name !== undefined) update.name = body.name.trim()
    if (body.color !== undefined) update.color = body.color
    if (body.is_favorite !== undefined) update.is_favorite = body.is_favorite

    if (update.name !== undefined && !update.name) {
      return NextResponse.json(
        { data: null, error: { message: 'カテゴリ名は必須です' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('categories')
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const { id } = await params

    const { error } = await supabase
      .from('categories')
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
