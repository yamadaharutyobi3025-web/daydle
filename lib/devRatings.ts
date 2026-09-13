/**
 * 開発環境専用。「今日」画面に表示された遠回りに対する人力評価
 * （◎/○/△/×）を、この端末のlocalStorageだけに蓄積するための
 * 推薦品質の実機評価ツール。Supabaseへは一切送信しない。
 *
 * daydle_state_v1（lib/storage.ts）・daydle_today_context_v1
 * （lib/todayContext.ts）等のアプリ本体の状態は読み取るだけで、
 * 一切書き込まない。別キー（daydle_dev_ratings_v1）に保存するため、
 * 「今日」「記録」「1日1回制限」などの既存挙動には影響しない。
 */
import { todayKey } from "@/lib/date";
import type { Situation, Feeling } from "@/types/context";

const STORAGE_KEY = "daydle_dev_ratings_v1";

export type DevRating = "great" | "good" | "meh" | "bad";

export const DEV_RATING_LABEL: Record<DevRating, string> = {
  great: "◎ かなりやりたい",
  good: "○ やってもいい",
  meh: "△ 微妙",
  bad: "× 合っていない",
};

export const DEV_RATING_SYMBOL: Record<DevRating, string> = {
  great: "◎",
  good: "○",
  meh: "△",
  bad: "×",
};

export interface DevRatingEntry {
  ratedAt: string; // ISO日時
  date: string; // todayKey()（評価時点の日付）
  situation: Situation | null;
  feeling: Feeling | null;
  missionId: string;
  missionText: string;
  rating: DevRating;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

function load(): DevRatingEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DevRatingEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: DevRatingEntry[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 保存に失敗しても評価画面自体は致命的ではないため何もしない
  }
}

/** 開発環境専用。今日の遠回りへの評価を1件追加する。本番では何もしない。 */
export function addDevRating(input: {
  situation: Situation | null;
  feeling: Feeling | null;
  missionId: string;
  missionText: string;
  rating: DevRating;
}): void {
  if (!isDevEnvironment()) return;
  const entries = load();
  entries.push({
    ratedAt: new Date().toISOString(),
    date: todayKey(),
    ...input,
  });
  save(entries);
}

/** 開発環境専用。保存済みの評価一覧を新しい順で返す。本番では空配列。 */
export function getDevRatings(): DevRatingEntry[] {
  if (!isDevEnvironment()) return [];
  return load().slice().reverse();
}

/** 開発環境専用。評価をすべて削除する。本番では何もしない。 */
export function clearDevRatings(): void {
  if (!isDevEnvironment()) return;
  save([]);
}
