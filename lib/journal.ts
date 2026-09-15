/**
 * 「今日の完了記録」をSupabaseへユーザー単位で保存するためのモジュール
 * （supabase/migrations/0012_journal_entries.sql）。
 *
 * スコープは「できた」まで到達した記録だけ。accepted/declinedは
 * ログイン不要の一時状態のまま、今まで通りlib/storage.ts（端末ローカル）
 * だけで扱う。ここはSupabaseへの読み書きだけを行い、認証チェック・
 * リダイレクト等のUIロジックは呼び出し側（TodayScreen等）の責務とする。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Reflection } from "@/lib/storage";

export type JournalEntry = Database["public"]["Tables"]["journal_entries"]["Row"];

const PHOTO_BUCKET = "journal-photos";
/** PostgreSQLのunique_violation。1人1日1件（unique(user_id, date)）に抵触したとき。 */
const UNIQUE_VIOLATION = "23505";

export interface JournalSaveError {
  code: string | null;
  message: string;
  /** 既にその日の記録が存在する（同日に2件目を完了しようとした）場合true。 */
  alreadyCompleted: boolean;
}

function toSaveError(error: { code?: string | null; message: string }): JournalSaveError {
  return {
    code: error.code ?? null,
    message: error.message,
    alreadyCompleted: error.code === UNIQUE_VIOLATION,
  };
}

/** ログイン中ユーザーの記録一覧を新しい順で取得する（/record専用）。 */
export async function fetchJournalEntries(
  supabase: SupabaseClient<Database>
): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("date", { ascending: false });
  if (error || !data) return [];
  return data;
}

/** 指定した日付の記録を1件取得する（post/newの「今日の完了」参照用）。 */
export async function fetchJournalEntryForDate(
  supabase: SupabaseClient<Database>,
  date: string
): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * 「できた」を押した瞬間の記録を1件作る。既にその日の記録があれば
 * unique_violationで失敗する（alreadyCompleted: trueとして返す）。
 */
export async function insertCompletedJournalEntry(
  supabase: SupabaseClient<Database>,
  input: { userId: string; date: string; missionId: string; missionText: string }
): Promise<{ entry: JournalEntry | null; error: JournalSaveError | null }> {
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: input.userId,
      date: input.date,
      mission_id: input.missionId,
      mission_text: input.missionText,
    })
    .select()
    .single();
  if (error || !data) {
    return { entry: null, error: toSaveError(error ?? { message: "保存に失敗しました。" }) };
  }
  return { entry: data, error: null };
}

/** note・reflectionを、その日の既存の記録へ追記する（/journal・/record専用）。 */
export async function updateJournalEntry(
  supabase: SupabaseClient<Database>,
  date: string,
  patch: { note?: string | null; reflection?: Reflection | null; photoPath?: string | null }
): Promise<{ error: JournalSaveError | null }> {
  const update: Database["public"]["Tables"]["journal_entries"]["Update"] = {};
  if (patch.note !== undefined) update.note = patch.note;
  if (patch.photoPath !== undefined) update.photo_path = patch.photoPath;
  if (patch.reflection !== undefined) update.reflection = patch.reflection;

  const { error } = await supabase.from("journal_entries").update(update).eq("date", date);
  if (error) return { error: toSaveError(error) };
  return { error: null };
}

function photoPathFor(userId: string, date: string): string {
  return `${userId}/${date}.jpg`;
}

/** 写真をSupabase Storageへアップロードし、パスを返す。 */
export async function uploadJournalPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  date: string,
  blob: Blob
): Promise<{ path: string | null; error: string | null }> {
  const path = photoPathFor(userId, date);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

/** 写真の閲覧用signed URLを発行する（本人の行のみRLSで許可されている）。 */
export async function getJournalPhotoUrl(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteJournalPhoto(
  supabase: SupabaseClient<Database>,
  path: string
): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** 「できた」記録一覧の中で、指定した日付が何件目か（古い順に1から）を返す。 */
export function computeDetourNumber(entries: JournalEntry[], date: string): number {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const idx = sorted.findIndex((e) => e.date === date);
  return idx === -1 ? sorted.length : idx + 1;
}
