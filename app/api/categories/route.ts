import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-auth'
import { currentUser } from '@clerk/nextjs/server'
import { CategoryInsert } from '@/types'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error'
}

// GET /api/categories
export async function GET() {
  try {
    const { supabase } = await createAuthenticatedSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ data: null, error: { message } }, { status: 500 })
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await createAuthenticatedSupabaseClient()
    const clerkUser = await currentUser()
    const body = await request.json()

    // usersテーブルにupsert（初回データ登録時に作成する）
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true })

    if (upsertError) throw upsertError

    const insert: CategoryInsert = {
      user_id: userId,
      name: body.name?.trim(),
      color: body.color ?? 'blue-500',
      is_favorite: body.is_favorite ?? false,
    }

    if (!insert.name) {
      return NextResponse.json(
        { data: null, error: { message: 'カテゴリ名は必須です' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('categories')
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
