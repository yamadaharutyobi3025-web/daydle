import { missions } from "@/data/missions";
import { communityMissions } from "@/data/community";
import type { Mission, Mood, CommunityMission } from "@/types/mission";
import type { PlaceContext, SchedulePressure, SocialContext } from "@/types/context";
import { getRecentMissionIds, getCompletedCount } from "@/lib/storage";

export interface SelectionInput {
  minutes: number;
  moods: Mood[];
  /** Context Engine: 以下は任意。未指定の項目はその軸での絞り込み・優先度づけを行わない。 */
  placeContext?: PlaceContext | null;
  schedulePressure?: SchedulePressure | null;
  socialContext?: SocialContext | null;
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
 * Context Engine: 明確に矛盾する候補を除外する（実行可能性判定）。
 * 未指定の条件・未指定のcontextはすべて「制約なし」として扱うため、
 * contextを設定していない既存ミッションの挙動は変わらない。
 */
function isContextFeasible(
  mission: Mission,
  ctx: { placeContext?: PlaceContext | null; schedulePressure?: SchedulePressure | null }
): boolean {
  const c = mission.contexts;
  if (!c) return true;

  if (
    c.requiresOutside &&
    ctx.placeContext &&
    ctx.placeContext !== "outside" &&
    ctx.placeContext !== "transit"
  ) {
    return false;
  }

  if (c.requiresOtherPeopleNearby && ctx.placeContext === "home") {
    return false;
  }

  if (c.places?.length && ctx.placeContext && !c.places.includes(ctx.placeContext)) {
    return false;
  }

  if (
    c.schedulePressure?.length &&
    ctx.schedulePressure &&
    !c.schedulePressure.includes(ctx.schedulePressure)
  ) {
    return false;
  }

  return true;
}

/** schedulePressure=soon_busyのときは、面倒の大きいミッションを原則除外する。 */
function withinFrictionBudget(mission: Mission, schedulePressure?: SchedulePressure | null): boolean {
  if (schedulePressure !== "soon_busy") return true;
  const level = mission.frictionLevel ?? 1;
  return level <= 1;
}

function placeAffinity(mission: Mission, placeContext?: PlaceContext | null): number {
  if (!placeContext) return 0;
  const places = mission.contexts?.places;
  if (places?.length) return places.includes(placeContext) ? 2 : 0;
  if (placeContext === "home" && mission.environment === "inside") return 1;
  if ((placeContext === "outside" || placeContext === "transit") && mission.environment === "outside") {
    return 1;
  }
  return 0;
}

function scheduleAffinity(mission: Mission, pressure?: SchedulePressure | null): number {
  if (!pressure) return 0;
  const level = mission.frictionLevel ?? 1;
  if (pressure === "free") return level >= 2 ? 1 : 0;
  if (pressure === "soon_busy") return level <= 1 ? 1 : 0;
  return 0;
}

/**
 * frictionLevelの「優先」（除外ではない）。初期ユーザーには0〜1を、
 * 完了回数が増えたユーザーには2も同等に優先する。既存の時間解放(3回/7回)の
 * しきい値をそのまま流用し、新しい数値UIは一切追加しない。
 */
function experienceAffinity(mission: Mission, completedCount: number): number {
  const level = mission.frictionLevel ?? 1;
  const ceiling = completedCount >= 3 ? 2 : 1;
  return level <= ceiling ? 1 : 0;
}

function socialAffinity(mission: Mission, social?: SocialContext | null): number {
  const list = mission.contexts?.social;
  if (!social || !list?.length) return 0;
  return list.includes(social) ? 1 : 0;
}

/**
 * 実行可能性・場所・スケジュール・経験値・一緒にいる人・直近出現有無の順にスコアづけして並べ替える。
 * 気分はこの時点で既にexactMatchにより保証済みのため、追加のスコアづけは行わない。
 */
function rankByContext(pool: Mission[], input: SelectionInput): Mission[] {
  const recentIds = new Set(getRecentMissionIds());
  const completedCount = getCompletedCount();

  const scored = pool.map((m) => ({
    mission: m,
    score: [
      placeAffinity(m, input.placeContext),
      scheduleAffinity(m, input.schedulePressure),
      experienceAffinity(m, completedCount),
      socialAffinity(m, input.socialContext),
      recentIds.has(m.id) ? 0 : 1,
    ],
  }));

  scored.sort((a, b) => {
    for (let i = 0; i < a.score.length; i++) {
      if (a.score[i] !== b.score[i]) return b.score[i] - a.score[i];
    }
    return Math.random() - 0.5;
  });

  return scored.map((s) => s.mission);
}

/**
 * 選択された時間・気分・いまの状況にもとづいて、今日の候補ミッション（最大3件）を選ぶ。
 *
 * 優先順位：
 * 1. 実行可能性（contextに明確に矛盾しない）
 * 2. duration完全一致
 * 3. placeContext
 * 4. schedulePressure（frictionLevelとの整合を含む）
 * 5. socialContext
 * 6. mood（この時点では既に完全一致が保証されている）
 * 7. 最近出ていないmission
 * 8. ランダム性
 *
 * data/missions.ts は「時間(5/15/30/60) × 気分(6種)」の24パターン全てに
 * 最低3件ずつ完全一致するミッションを持つように維持されている。
 * この保証を壊さないため、「時間完全一致 + 気分完全一致」は引き続き必須の主経路とし、
 * contextによる絞り込みは、まずその主経路の中で行う。
 * contextに合う候補が1件もない場合だけ、context条件を緩めて主経路全体から選ぶ
 * （気分の完全一致は緩めない）。
 */
export function selectDailyCandidates(input: SelectionInput): Mission[] {
  const exactDuration = (m: Mission) => m.duration === input.minutes;
  const exactMatch = (m: Mission) =>
    exactDuration(m) && matchesMood(m, input.moods) && matchesEnvironment(m, input.moods);
  const feasible = (m: Mission) =>
    isContextFeasible(m, input) && withinFrictionBudget(m, input.schedulePressure);

  // 主経路：時間完全一致 + 気分完全一致 + 実行可能性を満たす候補。
  const feasiblePool = missions.filter((m) => exactMatch(m) && feasible(m));
  if (feasiblePool.length > 0) {
    return rankByContext(feasiblePool, input).slice(0, 3);
  }

  // contextに合う候補が0件のときは、context条件だけ緩めて主経路(時間×気分の完全一致)へ。
  const exactPool = missions.filter(exactMatch);
  if (exactPool.length > 0) {
    return rankByContext(exactPool, input).slice(0, 3);
  }

  // 保険：本来は到達しない。今後ミッションを削除・変更して
  // 24パターンのいずれかが0件になった場合だけの安全弁。
  const notRecent = (m: Mission) => !getRecentMissionIds().includes(m.id);
  const byDuration = (m: Mission) => m.duration <= input.minutes;
  const fallbackAttempts: Array<(m: Mission) => boolean> = [
    (m) => byDuration(m) && matchesMood(m, input.moods) && matchesEnvironment(m, input.moods) && notRecent(m),
    (m) => byDuration(m) && matchesMood(m, input.moods) && matchesEnvironment(m, input.moods),
    (m) => byDuration(m) && matchesEnvironment(m, input.moods),
    (m) => byDuration(m),
    () => true,
  ];

  for (const filter of fallbackAttempts) {
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
