import type { DurationDisplayTier } from "@/types/mission";

/**
 * 画面表示用の「体感所要時間」ラベル。
 *
 * これまで「◯ MIN」と分単位をそのまま出していたが、本文の実際の体感
 * （数秒で終わるものから、じっくり1時間かけるものまで）とズレる
 * ミッションがあったため、4段階の大まかな表現に切り替える。
 *
 * duration（分・数値）自体は段階解放（lib/unlocks.ts）・記録・
 * 推薦ロジック（lib/missionSelector.ts）がそのまま使い続けるため、
 * このファイルは表示専用で、durationの数値には一切書き込まない。
 */
const TIER_LABEL: Record<DurationDisplayTier, string> = {
  instant: "一瞬",
  short: "5分くらい",
  medium: "15分くらい",
  slow: "ゆっくり",
};

/**
 * duration（分）から、既定の体感tierを導く。
 * 境界値の目安: 〜1分=instant / 〜7分=short / 〜20分=medium / それ以上=slow。
 * 個別のミッションが本文の体感と大きくズレる場合は、
 * Mission.displayDurationで上書きする（このデフォルト判定は使われない）。
 */
function deriveTierFromMinutes(minutes: number): DurationDisplayTier {
  if (minutes <= 1) return "instant";
  if (minutes <= 7) return "short";
  if (minutes <= 20) return "medium";
  return "slow";
}

/**
 * 画面に出す所要時間ラベルを返す。overrideTierが指定されていれば
 * それを最優先し、無ければduration（分）から既定のtierを導く。
 */
export function formatDurationLabel(minutes: number, overrideTier?: DurationDisplayTier | null): string {
  const tier = overrideTier ?? deriveTierFromMinutes(minutes);
  return TIER_LABEL[tier];
}
