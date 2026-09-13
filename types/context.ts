/**
 * Context Engine: 「今その人が本当に無理なく実行できるか」を判断するための
 * ユーザーの現在状況。サーバーには送信せず、localStorageにのみ保存する。
 */

export type PlaceContext = "home" | "work_school" | "outside" | "transit";

export type SchedulePressure = "soon_busy" | "some_time" | "free";

export type SocialContext = "alone" | "with_someone";

/** 生の緯度経度は永続保存しない。許可状態だけを持つ（今回は基盤のみ）。 */
export type LocationPermission = "unknown" | "granted" | "denied";

/**
 * Context Engine v2: 「今日」を開いたときに最初に聞く、状況と気分。
 * 上のPlaceContext/SchedulePressure/SocialContext（v1）は既存のミッション
 * データ（Mission.contexts）の任意条件として引き続き残すが、
 * WelcomeFlowからは呼ばなくなった。v1を置き換えるのではなく、
 * 新しい2問だけの入り口が使う別の軸として追加する。
 */
export type Situation = "home" | "outside" | "transit" | "work_school" | "unsure";

export type Feeling =
  | "tired" // 少し疲れている
  | "bored" // 退屈している
  | "calm_seeking" // 落ち着きたい
  | "want_to_do_something" // 何かしたい
  | "good_mood" // 気分がいい
  | "neutral"; // なんとなく
