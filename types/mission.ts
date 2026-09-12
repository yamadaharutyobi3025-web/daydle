/**
 * DAYDLEの「遠回り」ミッションを表す型。
 * このファイルの形を変えずにデータを増やせば、data/missions.ts への追加だけで
 * 新しいミッションを増やせるようにしている。
 */

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
}

export interface CommunityMission {
  id: string;
  location: string;
  title: string;
  description: string;
  duration: number;
  phoneMode: PhoneMode;
}
