/**
 * 「今日」画面の新しい入り口（状況→気分の2問）で、質問の途中経過を
 * 保持するための、専用のlocalStorageキー。
 *
 * daydle_state_v1（lib/storage.ts）とは別キーにすることで、既存の
 * TodayMissionState/HistoryEntryの形やバリデーションには一切触れない。
 * 日付が変われば自動的に無効になる（today同様、todayKey()で判定する）。
 */
import { todayKey } from "@/lib/date";
import type { Situation, Feeling } from "@/types/context";

const STORAGE_KEY = "daydle_today_context_v1";

interface StoredState {
  date: string;
  situation: Situation | null;
  feeling: Feeling | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): StoredState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed.date !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(state: StoredState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存に失敗しても致命的ではない（単に次回また質問からになるだけ）
  }
}

export function getTodayContext(): { situation: Situation | null; feeling: Feeling | null } {
  const state = load();
  return { situation: state?.situation ?? null, feeling: state?.feeling ?? null };
}

export function saveTodaySituation(situation: Situation): void {
  const current = load();
  save({ date: todayKey(), situation, feeling: current?.feeling ?? null });
}

export function saveTodayFeeling(feeling: Feeling): void {
  const current = load();
  save({ date: todayKey(), situation: current?.situation ?? null, feeling });
}
