import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * ClerkのユーザーIDをカスタムヘッダーに付与したSupabaseクライアントを返す。
 * API Route内でのみ使用すること（サーバーサイド専用）。
 * RLSポリシーが `get_clerk_user_id()` でユーザーを識別する。
 */
export async function createAuthenticatedSupabaseClient() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-clerk-user-id": userId,
      },
    },
  });

  return { supabase, userId };
}
