import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントサイド・サーバーサイド共用の基本クライアント（RLSなし）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
