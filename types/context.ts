/**
 * Context Engine: 「今その人が本当に無理なく実行できるか」を判断するための
 * ユーザーの現在状況。サーバーには送信せず、localStorageにのみ保存する。
 */

export type PlaceContext = "home" | "work_school" | "outside" | "transit";

export type SchedulePressure = "soon_busy" | "some_time" | "free";

export type SocialContext = "alone" | "with_someone";

/** 生の緯度経度は永続保存しない。許可状態だけを持つ（今回は基盤のみ）。 */
export type LocationPermission = "unknown" | "granted" | "denied";
