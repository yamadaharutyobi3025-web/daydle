import { todayKey } from "@/lib/date";
import type { Mood } from "@/types/mission";

export type Reflection = "good" | "normal" | "meh" | "skipped";
export type TodayStatus = "pending" | "accepted" | "completed" | "declined";

/** 簡易タイマー。開始・終了を「絶対時刻」で持つことで、
 * ブラウザを閉じて再度開いたときも残り時間を計算し直せるようにする。 */
export interface MissionTimer {
  startedAt: number;
  endsAt: number;
  durationMinutes: number;
}

export interface TodayMissionState {
  date: string;
  /** 現在選ばれているミッションID */
  missionId: string;
  /** その日のために選ばれた候補（最大3件、固定順） */
  candidateIds: string[];
  currentIndex: number;
  rerollCount: number;
  status: TodayStatus;
  /** タイマーは補助機能。未使用なら存在しない／nullのまま。 */
  timer?: MissionTimer | null;
  /** Welcome画面で選んだ気分。完了メッセージの出し分けに使う（「みんな」経由の場合はnull）。 */
  mood?: Mood | null;
}

const VALID_MOODS: Mood[] = ["quiet", "adventure", "outside", "home", "people", "empty"];

/** 「ひとこと」の文字数上限。 */
export const NOTE_MAX_LENGTH = 150;

export interface HistoryEntry {
  date: string;
  missionId: string;
  status: "accepted" | "completed" | "declined";
  reflection: Reflection | null;
  /** 任意のひとこと。写真と同じく、できた後に残せる小さな記録。 */
  note?: string | null;
  /** IndexedDBに写真がある場合true（画像本体はここには持たない）。 */
  hasPhoto?: boolean;
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

function isValidMissionTimer(value: unknown): value is MissionTimer {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.startedAt === "number" &&
    typeof v.endsAt === "number" &&
    typeof v.durationMinutes === "number"
  );
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
    (v.status === "pending" ||
      v.status === "accepted" ||
      v.status === "completed" ||
      v.status === "declined") &&
    (v.timer === undefined || v.timer === null || isValidMissionTimer(v.timer)) &&
    (v.mood === undefined ||
      v.mood === null ||
      (typeof v.mood === "string" && VALID_MOODS.includes(v.mood as Mood)))
  );
}

function isValidHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.missionId === "string" &&
    (v.status === "accepted" || v.status === "completed" || v.status === "declined") &&
    (v.reflection === null ||
      v.reflection === "good" ||
      v.reflection === "normal" ||
      v.reflection === "meh" ||
      v.reflection === "skipped") &&
    (v.note === undefined || v.note === null || typeof v.note === "string") &&
    (v.hasPhoto === undefined || typeof v.hasPhoto === "boolean")
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

/** 今日のミッションに、開始時刻／終了予定時刻を持つ簡易タイマーを設定する。 */
export function startMissionTimer(durationMinutes: number): TodayMissionState | null {
  const startedAt = Date.now();
  const endsAt = startedAt + durationMinutes * 60_000;
  return updateTodayMission((c) => ({
    ...c,
    timer: { startedAt, endsAt, durationMinutes },
  }));
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

/** できた後の「ひとこと」「写真の有無」を、その日の記録へ追記する。 */
export function setJournalEntry(
  date: string,
  patch: { note?: string | null; hasPhoto?: boolean }
): void {
  const state = loadState();
  const idx = state.history.findIndex((h) => h.date === date);
  if (idx === -1) return;
  state.history[idx] = { ...state.history[idx], ...patch };
  saveState(state);
}

/** その日が、何回目の「完了した遠回り」かを返す（古い順に1から数える）。 */
export function getDetourNumber(date: string): number {
  const completed = getHistory()
    .filter((h) => h.status === "completed")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const idx = completed.findIndex((h) => h.date === date);
  return idx === -1 ? completed.length : idx + 1;
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
