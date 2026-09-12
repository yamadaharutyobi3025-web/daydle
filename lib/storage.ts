import { todayKey } from "@/lib/date";

export type Reflection = "good" | "normal" | "meh" | "skipped";
export type TodayStatus = "pending" | "accepted" | "declined";

export interface TodayMissionState {
  date: string;
  /** 現在選ばれているミッションID */
  missionId: string;
  /** その日のために選ばれた候補（最大3件、固定順） */
  candidateIds: string[];
  currentIndex: number;
  rerollCount: number;
  status: TodayStatus;
}

export interface HistoryEntry {
  date: string;
  missionId: string;
  status: "accepted" | "declined";
  reflection: Reflection | null;
}

export interface DaydleState {
  today: TodayMissionState | null;
  history: HistoryEntry[];
}

const STORAGE_KEY = "daydle_state_v1";

const emptyState: DaydleState = {
  today: null,
  history: [],
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 壊れた・古い形式のデータを弾き、安全にWelcome画面へフォールバックできるようにする。 */
function isValidTodayMissionState(value: unknown): value is TodayMissionState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.missionId === "string" &&
    Array.isArray(v.candidateIds) &&
    v.candidateIds.every((id) => typeof id === "string") &&
    typeof v.currentIndex === "number" &&
    typeof v.rerollCount === "number" &&
    (v.status === "pending" || v.status === "accepted" || v.status === "declined")
  );
}

function isValidHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.missionId === "string" &&
    (v.status === "accepted" || v.status === "declined") &&
    (v.reflection === null ||
      v.reflection === "good" ||
      v.reflection === "normal" ||
      v.reflection === "meh" ||
      v.reflection === "skipped")
  );
}

// useSyncExternalStoreから安全に参照できるよう、生の文字列が変わらない限り
// 同じオブジェクト参照を返すキャッシュを持つ。
let cachedRaw: string | null | undefined;
let cachedState: DaydleState = emptyState;

export function loadState(): DaydleState {
  if (!isBrowser()) return emptyState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  if (!raw) {
    cachedState = emptyState;
    return cachedState;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DaydleState>;
    cachedState = {
      today: isValidTodayMissionState(parsed.today) ? parsed.today : null,
      history: Array.isArray(parsed.history)
        ? parsed.history.filter(isValidHistoryEntry)
        : [],
    };
  } catch {
    cachedState = emptyState;
  }
  return cachedState;
}

function saveState(state: DaydleState): void {
  if (!isBrowser()) return;
  try {
    const raw = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedState = state;
  } catch {
    // 保存に失敗しても致命的ではないため何もしない
  }
}

/** 今日分のミッション状態を返す。日付が変わっていればnullを返す。 */
export function getTodayMission(): TodayMissionState | null {
  const state = loadState();
  if (!state.today || state.today.date !== todayKey()) return null;
  return state.today;
}

export function setTodayMission(today: TodayMissionState): void {
  const state = loadState();
  state.today = today;
  saveState(state);
}

/** 壊れた・参照先のないミッション状態をリセットし、Welcome画面へ戻れるようにする。 */
export function clearTodayMission(): void {
  const state = loadState();
  state.today = null;
  saveState(state);
}

export function updateTodayMission(
  updater: (current: TodayMissionState) => TodayMissionState
): TodayMissionState | null {
  const current = getTodayMission();
  if (!current) return null;
  const next = updater(current);
  setTodayMission(next);
  return next;
}

/** 今日の記録を履歴へ反映する（同じ日付があれば上書き）。 */
export function recordTodayHistory(entry: HistoryEntry): void {
  const state = loadState();
  const others = state.history.filter((h) => h.date !== entry.date);
  state.history = [entry, ...others].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  saveState(state);
}

export function setReflection(date: string, reflection: Reflection): void {
  const state = loadState();
  const idx = state.history.findIndex((h) => h.date === date);
  if (idx === -1) return;
  state.history[idx] = { ...state.history[idx], reflection };
  saveState(state);
}

export function getHistory(): HistoryEntry[] {
  return loadState().history;
}

/** 直近14日間に登場したミッションIDの一覧（再抽選での重複回避に使う）。 */
export function getRecentMissionIds(days = 14): string[] {
  const history = getHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return history.filter((h) => h.date >= cutoffKey).map((h) => h.missionId);
}
