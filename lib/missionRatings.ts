/**
 * 「今日」画面に表示された遠回りへの実使用評価（◎/○/△/×）を、
 * DAYDLE本人（NEXT_PUBLIC_OWNER_USER_ID）だけがSupabaseへ保存するための
 * モジュール。一般ユーザーには一切表示されない（本当の安全境界は
 * supabase/migrations/0011_mission_ratings.sqlのRLS）。
 *
 * daydle_state_v1（lib/storage.ts）・daydle_today_context_v1
 * （lib/todayContext.ts）等のアプリ本体の状態は読み取るだけで、
 * 一切書き込まない。既存の「今日」「記録」「1日1回制限」「投稿」
 * 「フォロー」「通知」とは完全に独立したテーブルのため、それらの
 * 挙動には影響しない。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Situation, Feeling } from "@/types/context";

export type MissionRating = "great" | "good" | "meh" | "bad";

export const MISSION_RATING_LABEL: Record<MissionRating, string> = {
  great: "◎ かなりやりたい",
  good: "○ やってもいい",
  meh: "△ 微妙",
  bad: "× 合っていない",
};

export const MISSION_RATING_SYMBOL: Record<MissionRating, string> = {
  great: "◎",
  good: "○",
  meh: "△",
  bad: "×",
};

export type MissionRatingEntry = Database["public"]["Tables"]["mission_ratings"]["Row"];

/** このブラウザで表示してよい本人（DAYDLE運営者）のuser_id。未設定なら誰にも表示しない。 */
export function getOwnerUserId(): string | null {
  return process.env.NEXT_PUBLIC_OWNER_USER_ID || null;
}

/** ログイン中のユーザーが、評価ウィジェットを表示してよい本人かどうか。 */
export async function checkIsRatingOwner(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const ownerId = getOwnerUserId();
  if (!ownerId) return false;
  const { data } = await supabase.auth.getUser();
  return data.user?.id === ownerId;
}

/** 今日の遠回りへの評価を1件保存する。 */
export async function saveMissionRating(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    date: string;
    situation: Situation | null;
    feeling: Feeling | null;
    missionId: string;
    missionText: string;
    rating: MissionRating;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("mission_ratings").insert({
    user_id: input.userId,
    date: input.date,
    situation: input.situation,
    feeling: input.feeling,
    mission_id: input.missionId,
    mission_text: input.missionText,
    rating: input.rating,
  });
  return { error: error?.message ?? null };
}

/** 保存済みの評価一覧を新しい順で取得する（Macのdev確認画面専用）。 */
export async function fetchMissionRatings(
  supabase: SupabaseClient<Database>
): Promise<MissionRatingEntry[]> {
  const { data, error } = await supabase
    .from("mission_ratings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}
