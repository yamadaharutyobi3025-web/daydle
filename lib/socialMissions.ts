/**
 * 「私もやってみる」で他人の投稿を今日の候補として採用したとき、
 * その投稿の内容（本文・所要時間・PHONE MODE）をローカルのMission形式に
 * 変換してキャッシュする。
 *
 * daydle_state_v1（lib/storage.ts）とは別のlocalStorageキーに保存し、
 * 既存のTodayMissionState/HistoryEntryの形やバリデーションには一切
 * 触れない。findMissionById()（lib/missionSelector.ts）がこのキャッシュも
 * 見るようにすることで、today/timer/complete/journal/card/shareなど
 * 既存のどの画面もコードを変更せずにそのまま動く。
 *
 * これは「投稿をコピーして再投稿する」機能ではない。ローカルで
 * 「この内容を今日やってみる」ためだけの一時的な写しであり、
 * Supabase側には何も書き込まない。元の投稿・プロフィールも変更しない。
 */
import type { Mission, AllowedTool, PhoneMode } from "@/types/mission";

const STORAGE_KEY = "daydle_imported_missions_v1";

type ImportedMissionsMap = Record<string, Mission>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): ImportedMissionsMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ImportedMissionsMap) : {};
  } catch {
    return {};
  }
}

function save(map: ImportedMissionsMap): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 保存に失敗しても致命的ではない
  }
}

export function socialMissionId(postId: string): string {
  return `social:${postId}`;
}

export function getImportedMission(id: string): Mission | undefined {
  return load()[id];
}

type PostSnapshot = {
  id: string;
  mission_text: string;
  duration_minutes: number;
  phone_mode: PhoneMode;
  allowed_tools: string[];
};

/** 投稿のスナップショットをMission形式に変換し、ローカルにキャッシュして返す。 */
export function importPostAsMission(post: PostSnapshot): Mission {
  const mission: Mission = {
    id: socialMissionId(post.id),
    title: post.mission_text,
    description: post.mission_text,
    duration: post.duration_minutes,
    environment: "either",
    moods: [],
    phoneMode: post.phone_mode,
    allowedTools: post.allowed_tools as AllowedTool[],
    costLevel: 0,
    category: "adventure",
    safetyNote: null,
  };
  const map = load();
  map[mission.id] = mission;
  save(map);
  return mission;
}
