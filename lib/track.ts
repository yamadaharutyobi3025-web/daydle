/**
 * イベント計測の抽象化。
 * MVPではconsoleに出すだけだが、将来PostHog等に接続する場合は
 * この関数の中身だけを差し替えればよい。
 */
export type TrackEventName =
  | "mission_viewed"
  | "mission_accepted"
  | "mission_completed"
  | "mission_skipped"
  | "mission_rerolled"
  | "community_viewed"
  | "community_mission_adopted"
  | "reflection_answered"
  | "card_mode_opened";

export function trackEvent(
  name: TrackEventName,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  console.log(`[daydle:event] ${name}`, props ?? {});
}
