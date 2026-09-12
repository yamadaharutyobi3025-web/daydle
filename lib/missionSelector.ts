import { missions } from "@/data/missions";
import { communityMissions } from "@/data/community";
import type { Mission, Mood, CommunityMission } from "@/types/mission";
import { getRecentMissionIds } from "@/lib/storage";

export interface SelectionInput {
  minutes: number;
  moods: Mood[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchesEnvironment(mission: Mission, moods: Mood[]): boolean {
  const wantsOutside = moods.includes("outside");
  const wantsHome = moods.includes("home");
  if (wantsOutside && !wantsHome) {
    return mission.environment !== "inside";
  }
  if (wantsHome && !wantsOutside) {
    return mission.environment !== "outside";
  }
  return true;
}

function matchesMood(mission: Mission, moods: Mood[]): boolean {
  if (moods.length === 0) return true;
  return mission.moods.some((m) => moods.includes(m));
}

/**
 * 選択された時間・気分にもとづいて、今日の候補ミッション（最大3件）を選ぶ。
 * 完全に条件を満たす候補がなければ、条件を少しずつ緩めていく。
 */
export function selectDailyCandidates(input: SelectionInput): Mission[] {
  const recentIds = new Set(getRecentMissionIds());
  const notRecent = (m: Mission) => !recentIds.has(m.id);
  const byDuration = (m: Mission) => m.duration <= input.minutes;

  const attempts: Array<(m: Mission) => boolean> = [
    (m) => byDuration(m) && matchesMood(m, input.moods) && matchesEnvironment(m, input.moods) && notRecent(m),
    (m) => byDuration(m) && matchesMood(m, input.moods) && matchesEnvironment(m, input.moods),
    (m) => byDuration(m) && matchesEnvironment(m, input.moods),
    (m) => byDuration(m),
    () => true,
  ];

  for (const filter of attempts) {
    const pool = missions.filter(filter);
    if (pool.length > 0) {
      return shuffle(pool).slice(0, 3);
    }
  }

  return shuffle(missions).slice(0, 3);
}

const communityMissionCache = new Map<string, Mission>();

/** 「みんな」のサンプルミッションを、通常のMission形式に変換する（idごとに同じ参照を返す）。 */
export function communityMissionToMission(cm: CommunityMission): Mission {
  const cached = communityMissionCache.get(cm.id);
  if (cached) return cached;
  const usesMaps = cm.description.includes("地図");
  const mission: Mission = {
    id: cm.id,
    title: cm.title,
    description: cm.description,
    duration: cm.duration,
    environment: "either",
    moods: [],
    phoneMode: cm.phoneMode,
    allowedTools: cm.phoneMode === "tool" ? [usesMaps ? "maps" : "camera"] : [],
    costLevel: 0,
    category: "adventure",
    safetyNote: null,
  };
  communityMissionCache.set(cm.id, mission);
  return mission;
}

export function findMissionById(id: string): Mission | undefined {
  const found = missions.find((m) => m.id === id);
  if (found) return found;
  const community = communityMissions.find((c) => c.id === id);
  return community ? communityMissionToMission(community) : undefined;
}
