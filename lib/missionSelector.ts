import { missions } from "@/data/missions";
import { communityMissions } from "@/data/community";
import type { Mission, Mood, MissionCategory, CommunityMission } from "@/types/mission";
import type { PlaceContext, SchedulePressure, SocialContext, Situation, Feeling } from "@/types/context";
import { getRecentMissionIds, getCompletedCount } from "@/lib/storage";
import { getImportedMission } from "@/lib/socialMissions";
import { getUnlockedMinutes } from "@/lib/unlocks";

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

  // 現在地から移動しないと成立しないミッションは、家にいるユーザーには原則出さない。
  if (c.requiresTravel && ctx.placeContext === "home") {
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
 * 1. 実行不可能なmissionを除外（contextに明確に矛盾しない。家にいるのに
 *    店員に話しかける／外の誰かに声をかける／現在地から移動しないと成立しない、等）
 * 2. duration完全一致
 * 3. contextとの一致度（placeContext → schedulePressure(frictionLevelとの整合含む) → socialContext）
 * 4. mood（この時点では既に完全一致が保証されている）
 * 5. 最近出ていないmission
 * 6. ランダム性
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
  if (community) return communityMissionToMission(community);
  // 「私もやってみる」で他人の投稿から採用したミッション（lib/socialMissions.ts）。
  return getImportedMission(id);
}

// ============================================================================
// Context Engine v2: 「今、どんな状況？」「今、どんな気分？」の2問だけで
// 今日の遠回りを1つ決める、新しいWelcomeFlowの入り口。
//
// data/missions.ts 自体は変更しない。既存のMission.moods / Mission.contexts /
// Mission.environment / Mission.category から、状況(Situation)・気分(Feeling)
// との相性をその場で導出するだけの、単純なタグ付けにとどめる
// （AIによる推薦ではない）。
// ============================================================================

/** 場所を選ばず応用しやすいカテゴリ（屋内前提のミッションでも外出中の一部シーンに広げる）。 */
const FLEXIBLE_CATEGORIES: MissionCategory[] = ["quiet", "home", "pointless", "nostalgia", "book"];

/** 「外にいる」ことを積極的に使うカテゴリ（environmentが"either"でも外出寄りとして扱う）。 */
const OUTSIDE_LEANING_CATEGORIES: MissionCategory[] = ["walk", "nature", "adventure"];

/**
 * 状況ごとの「合いやすさ」を0〜3の目安で採点する。0でも除外はしない
 * （明確に矛盾するものだけisPhysicallyFeasibleForSituationで除外する）。
 * 内部の優先度づけにのみ使う数値で、ユーザーには一切見せない。
 *
 * - 外にいる: 外にいることを積極的に使うものを優先（requiresOutside /
 *   environment==="outside" > walk・nature・adventure系 > either > inside）
 * - 移動中: 今の移動を大きく中断しないものを優先。frictionLevel
 *   （0=その場ですぐ／1=少し動く／2=準備・移動が必要／3=明確な行動変更が必要）
 *   をそのまま使う。明示的に移動が必要（requiresTravel）や、家の物を前提に
 *   する（category==="home"）ものは低く扱う。
 * - 仕事・学校の合間: 5〜10分・frictionLevel低め（その場で完結）を強く優先。
 * - 家にいる: 家の中の物や空間を使うもの（category==="home"）を最優先し、
 *   次点でenvironment==="inside"全般。
 * - 特に決まっていない: 状況では絞り込まず、気分適合だけに委ねる。
 */
function situationAffinity(mission: Mission, situation: Situation): number {
  if (situation === "unsure") {
    // 状況未回答では除外はしないが、本文が特定の場所を前提にしている
    // ミッション（contexts.places）は場所依存性が高いとみなし優先度を下げる。
    return mission.contexts?.places?.length ? 0 : 1;
  }

  const c = mission.contexts;
  const friction = mission.frictionLevel ?? 1;

  switch (situation) {
    case "outside":
      if (c?.requiresOutside || mission.environment === "outside") return 3;
      if (OUTSIDE_LEANING_CATEGORIES.includes(mission.category)) return 2;
      if (mission.environment === "either") return 1;
      return 0; // environment === "inside"

    case "transit":
      if (c?.requiresTravel || mission.category === "home") return 0;
      if (mission.environment === "inside" && !FLEXIBLE_CATEGORIES.includes(mission.category)) {
        return 0;
      }
      // friction0/1はどちらも「今の移動をほぼ妨げない」として同格に扱う。
      // ここを0と1で分けると、気分に合うoutside系ミッション（frictionLevel1が
      // 大半）が上位互換のfriction0ミッションに常に押し負けてしまい、
      // 「状況は完璧だが気分を無視した1件」に固定化されやすくなるため。
      if (friction <= 1) return 3;
      if (friction === 2) return 1;
      return 0;

    case "work_school":
      if (c?.requiresTravel || friction >= 2) return 0;
      if (mission.duration <= 10) return 3;
      if (mission.duration <= 15) return 1;
      return 0;

    case "home":
      if (mission.category === "home") return 3;
      if (mission.environment === "inside") return 2;
      if (mission.environment === "either") return 1;
      return 0; // environment === "outside"

    default:
      return 1;
  }
}

const MOOD_TO_FEELINGS: Record<Mood, Feeling[]> = {
  quiet: ["calm_seeking", "neutral"],
  adventure: ["want_to_do_something", "good_mood"],
  outside: ["bored", "want_to_do_something", "good_mood"],
  home: ["tired", "calm_seeking"],
  people: ["good_mood", "want_to_do_something"],
  empty: ["tired", "calm_seeking", "neutral"],
};

function deriveFeelings(mission: Mission): Feeling[] {
  const set = new Set<Feeling>();
  for (const mood of mission.moods) {
    for (const feeling of MOOD_TO_FEELINGS[mood]) set.add(feeling);
  }
  if (set.size === 0) set.add("neutral");
  return Array.from(set);
}

/** 「落ち着きたい」に対して、移動・運動を伴うカテゴリを一段下げる対象。 */
const ACTIVE_CATEGORIES: MissionCategory[] = ["walk", "adventure"];

/**
 * 「仕事・学校の合間×退屈している」限定：窓・空（の見える場所）・
 * エレベーター・雑誌・鏡など、職場や学校に必ずあるとは限らない特定の
 * 設備・物を本文が前提にしているミッション。完全除外ではなく、
 * このピンポイントの組み合わせでだけ一段優先度を下げる（feelingAffinity
 * 側でsituationも見て判定するのはこの1組み合わせのためだけで、他の
 * situation×feelingの結果には影響しない＝地下・窓なしの職場や学校でも
 * 上位5件がその場で成立するようにするための最小限の調整）。
 */
const WORK_SCHOOL_PROP_DEPENDENT_IDS = new Set([
  "quiet_005", // 窓
  "pointless_002", // 空
  "pointless_006", // 鏡
  "adventure_002", // エレベーター
  "book_004", // 雑誌
]);

/**
 * 気分との合いやすさを0〜2の3段階で採点する。0=気分タグが一致しない、
 * 1=一致はするが、その気分にはあまり適さない性質を持つ、2=通常の一致。
 *
 * moods由来の一致判定（deriveFeelings）だけだと、例えば「落ち着きたい」で
 * walk/adventureカテゴリ（moodsに"empty"や"quiet"を併記しているだけの
 * 移動系ミッション）が、quiet/nature系の静かなミッションと同格に扱われて
 * しまう。「状況で不可能なものを落とす→その中で気分に合うものを上げる」
 * という考え方に寄せるため、気分側の一致にもこの程度の濃淡を持たせる。
 *
 * 調整は3種類のみ：
 * - 「落ち着きたい」×移動・運動系カテゴリ（walk/adventure）を一段下げる。
 * - 「少し疲れている」×frictionLevel2以上（準備・移動が必要／明確な行動
 *   変更が必要）を一段下げる。frictionLevel0〜1（その場ですぐ／軽い散歩・
 *   短い寄り道程度）はそのまま2のまま＝完全には除外しない。
 * - 「仕事・学校の合間×退屈している」×特定設備・物を前提にするミッション
 *   を一段下げる（上のWORK_SCHOOL_PROP_DEPENDENT_IDS参照）。
 * （何かしたい・気分がいい側でwalk/adventureを上げる調整は既に状況スコア
 * 側で十分機能しているため、ここでは行わない）。
 */
function feelingAffinity(mission: Mission, feeling: Feeling, situation: Situation): number {
  if (!deriveFeelings(mission).includes(feeling)) return 0;
  if (feeling === "calm_seeking" && ACTIVE_CATEGORIES.includes(mission.category)) return 1;
  if (feeling === "tired" && (mission.frictionLevel ?? 1) >= 2) return 1;
  if (
    feeling === "bored" &&
    situation === "work_school" &&
    WORK_SCHOOL_PROP_DEPENDENT_IDS.has(mission.id)
  ) {
    return 1;
  }
  return 2;
}

/**
 * 物理的に不可能な組み合わせだけを除外する（既存のisContextFeasibleと
 * 同じハード制約）。
 *
 * Mission.contexts.placesは「気分」とは別の軸＝本文が前提とする実行場所の
 * ハード制約として扱う。「家」「自宅」「冷蔵庫」等、家であることを前提に
 * するミッションにはcontexts.places: ["home"]が既存データとして
 * 一貫して設定されている（home_*だけでなく、quiet_003やbook_002等にも
 * 元から付与済み）。気分側のタグ付け（moods、deriveFeelings）をいくら
 * 広げても、本文が前提とする場所と矛盾する組み合わせをここで除外することで
 * 「気分」と「実行場所」を別軸として扱う。
 * "unsure"（状況未回答）はここでは除外せず、situationAffinity側で
 * 場所依存の強いミッションを弱く優先度づけするにとどめる。
 */
function isPhysicallyFeasibleForSituation(mission: Mission, situation: Situation): boolean {
  const c = mission.contexts;
  if (!c || situation === "unsure") return true;
  if (c.requiresOutside && situation !== "outside" && situation !== "transit") return false;
  if (c.requiresOtherPeopleNearby && situation === "home") return false;
  if (c.requiresTravel && situation === "home") return false;
  if (c.places?.length && !c.places.includes(situation)) return false;
  return true;
}

/** 解放済みの時間・直近未出現を優先しつつ、候補を最大3件にする。 */
function pickFewForContext(candidates: Mission[]): string[] {
  if (candidates.length === 0) return [];
  const completedCount = getCompletedCount();
  const unlockedMinutes = new Set(getUnlockedMinutes(completedCount));
  const recentIds = new Set(getRecentMissionIds());

  const withinUnlocked = candidates.filter((m) => unlockedMinutes.has(m.duration));
  const pool = withinUnlocked.length > 0 ? withinUnlocked : candidates;

  const notRecent = pool.filter((m) => !recentIds.has(m.id));
  const finalPool = notRecent.length > 0 ? notRecent : pool;

  return shuffle(finalPool).slice(0, 3).map((m) => m.id);
}

/**
 * 状況・気分から今日の候補（最大3件、[0]が提示する1件）を選ぶ。
 *
 * 考え方：「状況で明確に不可能・不向きなものを落とす → その中で気分に
 * 合うものを上げる」。優先順位そのものは「状況適合 > 気分適合 >
 * 直近との重複回避」のまま変えていないが、状況適合が気分適合を
 * 完全に押し切らないようにするため、状況スコア（0〜3）の水準を
 * 高い方から順に試しながら、各水準でまず気分スコア（0〜2）が
 * 高い候補を探す：
 *   1. 状況水準A以上 かつ 気分にもよく合う（feelingScore=2）
 *   2. 状況水準A以上 かつ 気分に一応合う（feelingScore>=1）
 *   3. （1・2とも0件なら）状況水準を一段階緩めて、水準Bでまた1から
 * のいずれかで候補が見つかった時点で確定する。状況水準をどこまで緩めても
 * 気分に合う候補が1件も無い場合だけ、最後に気分を諦めて最上位の状況水準
 * （situationThresholds[0]）だけで候補を返す＝状況適合が気分適合より
 * 優先されたまま0件になることは無い。
 * 重複回避（直近の未出現優先）と最終的なランダム性はpickFewForContext側。
 *
 * どの段階でも物理的に不可能な組み合わせ（isPhysicallyFeasibleForSituation）
 * は除外したまま。スコアはどちらも粗め（状況0〜3・気分0〜2）にとどめ、
 * 同じ状況・気分でも候補プールが複数件残るようにして、厳しくしすぎて
 * 毎回同じ1件に収束しないようにしている。
 */
export function selectByStateAndFeeling(situation: Situation, feeling: Feeling): string[] {
  const feasiblePool = missions.filter((m) => isPhysicallyFeasibleForSituation(m, situation));
  const pool = feasiblePool.length > 0 ? feasiblePool : missions;

  const scored = pool.map((m) => ({
    mission: m,
    situationScore: situationAffinity(m, situation),
    feelingScore: feelingAffinity(m, feeling, situation),
  }));

  const situationThresholds = Array.from(new Set(scored.map((s) => s.situationScore))).sort(
    (a, b) => b - a
  );

  for (const threshold of situationThresholds) {
    const inTier = scored.filter((s) => s.situationScore >= threshold);
    if (inTier.length === 0) continue;

    const bestFeeling = inTier.filter((s) => s.feelingScore === 2);
    if (bestFeeling.length > 0) return pickFewForContext(bestFeeling.map((s) => s.mission));

    const anyFeeling = inTier.filter((s) => s.feelingScore >= 1);
    if (anyFeeling.length > 0) return pickFewForContext(anyFeeling.map((s) => s.mission));

    // この状況水準には気分に合う候補が1件も無い。状況水準をもう一段階
    // 緩めて（＝situationThresholdsの次のより低い値へ）気分一致を探す。
  }

  // 状況水準をどこまで緩めても気分一致が無かった場合のみ、気分を諦めて
  // 最上位の状況水準を返す。
  const topTier = scored.filter((s) => s.situationScore >= situationThresholds[0]);
  return pickFewForContext(topTier.map((s) => s.mission));
}
