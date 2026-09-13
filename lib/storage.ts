import { todayKey } from "@/lib/date";
import type { Mood } from "@/types/mission";
import type {
  LocationPermission,
  PlaceContext,
  SchedulePressure,
  SocialContext,
} from "@/types/context";

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

/**
 * Context Engine: 前回選択した「いまの状況」。次回Welcome画面の初期値にするためだけに使う。
 * ミッション選択には影響するが、完了メッセージ・写真・記録・共有カードには一切使わない。
 *
 * 各項目はnull=「ユーザーがまだ一度も選んでいない」を表す。初回ユーザーは全項目null。
 * nullのままselectDailyCandidatesへ渡すと、そのcontext軸は制約・優先度づけの
 * どちらにも使われず、従来通りの「時間×気分」だけのロジックで選ばれる。
 */
export interface ContextState {
  lastPlaceContext: PlaceContext | null;
  lastSchedulePressure: SchedulePressure | null;
  lastSocialContext: SocialContext | null;
  /** 生の緯度経度は永続保存しない。許可状態だけを持つ（今回は基盤のみで未使用）。 */
  locationPermission: LocationPermission;
}

export interface DaydleState {
  today: TodayMissionState | null;
  history: HistoryEntry[];
  /** 長時間ミッション解放の通知を、すでに表示した分数（一度きりの表示にするため）。 */
  seenUnlocks: number[];
  context: ContextState;
}

const STORAGE_KEY = "daydle_state_v1";

const PLACE_CONTEXTS: PlaceContext[] = ["home", "work_school", "outside", "transit"];
const SCHEDULE_PRESSURES: SchedulePressure[] = ["soon_busy", "some_time", "free"];
const SOCIAL_CONTEXTS: SocialContext[] = ["alone", "with_someone"];
const LOCATION_PERMISSIONS: LocationPermission[] = ["unknown", "granted", "denied"];

const defaultContext: ContextState = {
  lastPlaceContext: null,
  lastSchedulePressure: null,
  lastSocialContext: null,
  locationPermission: "unknown",
};

const emptyState: DaydleState = {
  today: null,
  history: [],
  seenUnlocks: [],
  context: defaultContext,
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

function isValidContextState(value: unknown): value is ContextState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.lastPlaceContext === null ||
      (typeof v.lastPlaceContext === "string" &&
        PLACE_CONTEXTS.includes(v.lastPlaceContext as PlaceContext))) &&
    (v.lastSchedulePressure === null ||
      (typeof v.lastSchedulePressure === "string" &&
        SCHEDULE_PRESSURES.includes(v.lastSchedulePressure as SchedulePressure))) &&
    (v.lastSocialContext === null ||
      (typeof v.lastSocialContext === "string" &&
        SOCIAL_CONTEXTS.includes(v.lastSocialContext as SocialContext))) &&
    typeof v.locationPermission === "string" &&
    LOCATION_PERMISSIONS.includes(v.locationPermission as LocationPermission)
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
      seenUnlocks: Array.isArray(parsed.seenUnlocks)
        ? parsed.seenUnlocks.filter((n): n is number => typeof n === "number")
        : [],
      context: isValidContextState(parsed.context) ? parsed.context : defaultContext,
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

/**
 * 開発環境専用。今日のtodayMission（situation/feeling/missionIdは
 * lib/todayContext.ts側でクリア）と、今日分の履歴（完了状態）だけを
 * この端末上でリセットし、WelcomeFlowの2問から再テストできるようにする。
 *
 * 1日1遠回りの判定ロジック自体（hasCompletedToday()の実装）は変更せず、
 * その判定材料となるローカルデータだけを今日分に限って消す。過去の履歴
 * （他の日付）やSupabase上のpost/follow/notification/daily_completions
 * には一切触れない（daily_completionsへの書き込みはlib/socialSync.tsの
 * upsertのみで、読み取って今日の開始可否を判定する経路はこのアプリには
 * 存在しないため、ここでの操作はSupabase側と無関係）。
 *
 * 呼び出し側（components/DevResetTodayButton.tsx）は/dev-login
 * （NODE_ENV!=="development"ならページごと404）からのみ表示するが、
 * 念のためここでも本番ビルドでは何もしないようにしておく。
 */
export function resetTodayForDevTesting(): void {
  if (process.env.NODE_ENV !== "development") return;
  const key = todayKey();
  const state = loadState();
  state.today = null;
  state.history = state.history.filter((h) => h.date !== key);
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

/**
 * 1日1遠回りの共通判定。今日すでにcompletedの記録が1件でもあればtrue。
 * 「今日」「みんな」「共有カード」等、新しいmissionをaccepted状態にしうる
 * すべての入口で、UI個別にロジックを持たずこの関数を使うこと。
 */
export function hasCompletedToday(): boolean {
  const key = todayKey();
  return getHistory().some((h) => h.date === key && h.status === "completed");
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

/** 「できた」まで至った回数（長時間ミッションの解放判定に使う）。 */
export function getCompletedCount(): number {
  return getHistory().filter((h) => h.status === "completed").length;
}

/** 解放通知をすでに表示した分数の一覧。 */
export function getSeenUnlocks(): number[] {
  return loadState().seenUnlocks;
}

/** 指定した分数の解放通知を「表示済み」にする（以後は出さない）。 */
export function markUnlockSeen(minutes: number): void {
  const state = loadState();
  if (state.seenUnlocks.includes(minutes)) return;
  state.seenUnlocks = [...state.seenUnlocks, minutes];
  saveState(state);
}

/** 「いまの状況」の前回選択値。次回Welcome画面の初期値として使う。 */
export function getContext(): ContextState {
  return loadState().context;
}

/** 「いまの状況」の一部だけを更新する（他の項目は前回の値を保つ）。 */
export function saveContext(patch: Partial<ContextState>): void {
  const state = loadState();
  state.context = { ...state.context, ...patch };
  saveState(state);
}

/** 直近14日間に登場したミッションIDの一覧（再抽選での重複回避に使う）。 */
export function getRecentMissionIds(days = 14): string[] {
  const history = getHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return history.filter((h) => h.date >= cutoffKey).map((h) => h.missionId);
}
