-- =============================================
-- Project Tracker: 初期テーブル作成
-- ※ 何度でも実行可能（既存のテーブル・関数・トリガーを削除してから再作成）
-- =============================================

-- =============================================
-- 既存オブジェクトのクリーンアップ
-- テーブルをCASCADEで削除すると、依存するトリガー・ポリシーも自動削除される
-- =============================================
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS categories   CASCADE;
DROP TABLE IF EXISTS users        CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_clerk_user_id() CASCADE;

-- =============================================
-- Clerk連携用のヘルパー関数
-- RLSポリシーでClerkのユーザーIDを取得するために使用
-- =============================================
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.headers', true)::json->>'x-clerk-user-id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ユーザーテーブル
-- ClerkのユーザーIDをPKとして使用
-- Webhookは使わず、初回ログイン時にupsertで作成する
-- =============================================
CREATE TABLE users (
  id          TEXT        PRIMARY KEY,  -- ClerkのユーザーID（例: user_xxxxxxxx）
  email       TEXT        NOT NULL,
  timezone    TEXT        NOT NULL DEFAULT 'Asia/Tokyo',
  week_start  TEXT        NOT NULL DEFAULT 'monday' CHECK (week_start IN ('monday', 'sunday')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- カテゴリテーブル
-- =============================================
CREATE TABLE categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT 'blue-500',  -- Tailwindカラー名
  is_favorite BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- =============================================
-- 作業記録テーブル
-- =============================================
CREATE TABLE time_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id      UUID        NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER     NOT NULL CHECK (duration_seconds > 0),
  memo             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user_id     ON time_entries(user_id);
CREATE INDEX idx_time_entries_category_id ON time_entries(category_id);
CREATE INDEX idx_time_entries_started_at  ON time_entries(started_at DESC);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS)
-- カスタムヘッダー方式（Clerk × Supabase連携）
-- =============================================

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- ---------- users ----------

CREATE POLICY "users: 自分のデータのみ参照"
  ON users FOR SELECT
  USING (
    id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "users: 自分のデータのみ作成"
  ON users FOR INSERT
  WITH CHECK (
    id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "users: 自分のデータのみ更新"
  ON users FOR UPDATE
  USING (
    id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ---------- categories ----------

CREATE POLICY "categories: 自分のデータのみ参照"
  ON categories FOR SELECT
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "categories: 自分のデータのみ作成"
  ON categories FOR INSERT
  WITH CHECK (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "categories: 自分のデータのみ更新"
  ON categories FOR UPDATE
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "categories: 自分のデータのみ削除"
  ON categories FOR DELETE
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ---------- time_entries ----------

CREATE POLICY "time_entries: 自分のデータのみ参照"
  ON time_entries FOR SELECT
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "time_entries: 自分のデータのみ作成"
  ON time_entries FOR INSERT
  WITH CHECK (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "time_entries: 自分のデータのみ更新"
  ON time_entries FOR UPDATE
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "time_entries: 自分のデータのみ削除"
  ON time_entries FOR DELETE
  USING (
    user_id = get_clerk_user_id()
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );
