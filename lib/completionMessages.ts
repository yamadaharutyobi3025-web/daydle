import type { Mood } from "@/types/mission";
import { dayNumber } from "@/lib/date";

/**
 * 完了画面（/complete）の文言。Welcome画面で選んだ気分ごとに
 * 複数用意し、同じ日に見た場合は同じ文章になるよう日付で決定的に選ぶ。
 */
const COMPLETION_MESSAGES: Record<Mood, string[]> = {
  quiet: [
    "少しだけ、静けさを持ち帰りました。",
    "何もしない時間も、ちゃんと今日の一部です。",
    "今日は、少しだけゆっくり進みました。",
  ],
  adventure: [
    "いつもの外側に、少しだけ出ました。",
    "今日は、知らなかった方へ曲がりました。",
    "小さな冒険が、ひとつ残りました。",
  ],
  outside: [
    "今日の景色が、ひとつ増えました。",
    "少し外へ出るだけで、違う一日になりました。",
    "今日しか見なかった景色がありました。",
  ],
  home: [
    "いつもの場所に、違う時間が流れました。",
    "家の中にも、遠回りはありました。",
    "いつもの部屋を、少し違って見ました。",
  ],
  people: [
    "今日は、誰かを少し近くに思いました。",
    "ひとりでは終わらない遠回りでした。",
    "誰かを思い出したことも、今日の遠回りです。",
  ],
  empty: [
    "何もしない時間も、今日の遠回りでした。",
    "少しだけ、考えるのをやめました。",
    "何も決めない時間を、ひとつ残しました。",
  ],
};

const FALLBACK_MESSAGE = "今日は、いつもならしなかったことをひとつしました。";

/** 気分・日付から完了メッセージを決定的に選ぶ（気分未設定ならフォールバック）。 */
export function getCompletionMessage(
  mood: Mood | null | undefined,
  dateKey: string
): string {
  if (!mood) return FALLBACK_MESSAGE;
  const pool = COMPLETION_MESSAGES[mood];
  if (!pool || pool.length === 0) return FALLBACK_MESSAGE;
  const index = ((dayNumber(dateKey) % pool.length) + pool.length) % pool.length;
  return pool[index];
}
