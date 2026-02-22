// =============================================
// ユーザー
// =============================================

export type User = {
  id: string; // ClerkのユーザーID
  email: string;
  timezone: string; // 例: "Asia/Tokyo"
  week_start: "monday" | "sunday";
  created_at: string;
  updated_at: string;
};

export type UserUpsert = Omit<User, "created_at" | "updated_at">;

export type UserUpdate = Partial<Pick<User, "email" | "timezone" | "week_start">>;

// =============================================
// カテゴリ
// =============================================

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string; // Tailwind color name (e.g. "blue-500") or hex code
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryInsert = Omit<Category, "id" | "created_at" | "updated_at">;

export type CategoryUpdate = Partial<
  Omit<Category, "id" | "user_id" | "created_at" | "updated_at">
>;

// =============================================
// 作業記録（タイムエントリ）
// =============================================

export type TimeEntry = {
  id: string;
  user_id: string;
  category_id: string;
  category?: Category; // JOIN時に含まれる
  started_at: string; // ISO 8601
  ended_at: string; // ISO 8601
  duration_seconds: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryInsert = Omit<
  TimeEntry,
  "id" | "category" | "created_at" | "updated_at"
>;

export type TimeEntryUpdate = Partial<
  Omit<TimeEntry, "id" | "user_id" | "category" | "created_at" | "updated_at">
>;

// =============================================
// タイマー状態（localStorageで管理）
// =============================================

export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  status: TimerStatus;
  category_id: string | null;
  started_at: string | null;  // ISO 8601 - セッション最初の開始時刻（DBへの保存に使用）
  resumed_at: string | null;  // ISO 8601 - 現在のセグメント開始時刻（経過計算に使用）
  paused_at: string | null;   // ISO 8601 - 一時停止時刻
  elapsed_seconds: number;    // 過去のセグメントの累計秒数
};

// =============================================
// API レスポンス
// =============================================

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiError = {
  data: null;
  error: {
    message: string;
    code?: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// =============================================
// ダッシュボード統計
// =============================================

export type DashboardStats = {
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
};
