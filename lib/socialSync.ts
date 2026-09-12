import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { hasCompletedToday } from "@/lib/storage";
import { todayKey } from "@/lib/date";

/**
 * 「1日1遠回り」をログイン後もサーバー側で保証するための同期。
 *
 * 未ログインで今日の遠回りをcompletedにした後にログインした場合、
 * localStorageのhasCompletedToday()がtrueなら、今日の日付を
 * daily_completionsへupsertする。これにより
 * 「未ログインで1回完了 → ログインして2回目」を防ぐ
 * （新しいmissionを開始してよいかの判定は、常に
 * `ローカルのhasCompletedToday() OR サーバーのdaily_completions`のORで行う）。
 *
 * ログイン直後（onAuthStateChangeのSIGNED_IN）に一度呼べば十分。
 * 既に今日の行がある場合はupsertが何もしないので、何度呼んでも安全。
 */
export async function syncTodayCompletionIfNeeded(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  if (!hasCompletedToday()) return;

  await supabase
    .from("daily_completions")
    .upsert({ user_id: userId, date: todayKey() }, { onConflict: "user_id,date" });
}
