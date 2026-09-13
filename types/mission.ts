/**
 * DAYDLEの「遠回り」ミッションを表す型。
 * このファイルの形を変えずにデータを増やせば、data/missions.ts への追加だけで
 * 新しいミッションを増やせるようにしている。
 */

import type { PlaceContext, SchedulePressure, SocialContext } from "@/types/context";

export type PhoneMode = "offline" | "tool" | "connect";

export type Environment = "outside" | "inside" | "either";

export type Mood =
  | "quiet" // 静かに過ごしたい
  | "adventure" // 少し冒険したい
  | "outside" // 外に出たい
  | "home" // 家にいたい
  | "people" // 誰かと関わりたい
  | "empty"; // 何も考えたくない

export type AllowedTool = "camera" | "maps" | "call" | "message";

/**
 * 画面表示用の「体感所要時間」の目安。durationLabel参照。
 * duration（分）とは独立した表示専用の軸で、段階解放・記録・推薦
 * ロジックの計算には一切使わない。
 */
export type DurationDisplayTier = "instant" | "short" | "medium" | "slow";

export type MissionCategory =
  | "walk"
  | "nature"
  | "quiet"
  | "food"
  | "book"
  | "home"
  | "people"
  | "adventure"
  | "nostalgia"
  | "pointless";

/**
 * 完了画面（/complete）の文言を選ぶための分類。
 * 選抜ロジック用の MissionCategory とは別軸（「何をしたか」の体感に合わせた分類）。
 * 通常は category から自動変換されるが、映画・創作など体感がずれるミッションだけ
 * ここで個別に上書きする。今後の特殊なミッション追加でも同じ要領で指定できる。
 */
export type CompletionCategory =
  | "movie"
  | "book"
  | "walk"
  | "outside"
  | "create"
  | "observe"
  | "social"
  | "quiet"
  | "home"
  | "nostalgia"
  | "nature"
  | "food";

/**
 * Context Engine: 「実行可能性」判定のための任意条件。
 * 明確に判断できるミッションにだけ設定し、未指定の項目は制約なし（どの状況でも許可）として扱う。
 */
export interface MissionContexts {
  /** 指定した場所のときだけ候補にする（例: 家にある物を使うミッション）。 */
  places?: PlaceContext[];
  /** 指定した状況のときだけ候補にする（例: 「一緒にいる人と」を前提とするミッション）。 */
  social?: SocialContext[];
  /** 指定したスケジュール状況のときだけ候補にする。 */
  schedulePressure?: SchedulePressure[];
  /** 屋外にいる（外出中・移動中）ことが前提。家・職場学校では原則候補から除外する。 */
  requiresOutside?: boolean;
  /** 店員・通行人など、近くにいる他人に話しかけることが前提。家では候補から除外する。 */
  requiresOtherPeopleNearby?: boolean;
  /** 電車・バスなどでの移動が前提。 */
  requiresTravel?: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  /** 目安の所要時間（分） */
  duration: number;
  environment: Environment;
  moods: Mood[];
  phoneMode: PhoneMode;
  allowedTools: AllowedTool[];
  /** 0=無料, 1=少額, 2=やや出費あり */
  costLevel: 0 | 1 | 2;
  category: MissionCategory;
  safetyNote?: string | null;
  /** categoryからの自動変換では体感がずれる場合だけ指定する。 */
  completionCategory?: CompletionCategory | null;
  /** Context Engine用。未指定の場合は制約なし（どの状況でも候補になりうる）。 */
  contexts?: MissionContexts;
  /**
   * 0=その場ですぐできる / 1=少し動く / 2=少し準備・移動が必要 / 3=明確な行動変更が必要。
   * ユーザーには一切見せない内部指標。未指定は1（少し動く）相当として扱う。
   */
  frictionLevel?: 0 | 1 | 2 | 3;
  /**
   * 画面表示上の体感所要時間を、durationの数値による自動判定から
   * 上書きしたい場合だけ指定する（例: 本文が「10秒だけ」等、実際の
   * 体感がduration値と大きくズレるミッション）。未指定時は
   * lib/durationDisplay.tsがduration（分）から自動的に4段階へ
   * 振り分ける。durationの数値自体（段階解放・記録・推薦ロジックが
   * 使う値）には一切影響しない。
   */
  displayDuration?: DurationDisplayTier;
}

export interface CommunityMission {
  id: string;
  location: string;
  title: string;
  description: string;
  duration: number;
  phoneMode: PhoneMode;
}
