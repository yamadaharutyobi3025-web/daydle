import type { CompletionCategory, Mission, MissionCategory, Mood } from "@/types/mission";
import { dayNumber } from "@/lib/date";

/**
 * 完了画面（/complete）の文言。優先順位は
 * 1. ミッションの completionCategory（何をしたか）
 * 2. Welcome画面で選んだ mood（どんな気分だったか）
 * 3. fallback
 * 同じ日に見た場合は同じ文章になるよう、日付で決定的に選ぶ。
 */

const CATEGORY_TO_COMPLETION: Record<MissionCategory, CompletionCategory> = {
  walk: "walk",
  nature: "nature",
  quiet: "quiet",
  food: "food",
  book: "book",
  home: "home",
  people: "social",
  adventure: "outside",
  nostalgia: "nostalgia",
  pointless: "observe",
};

const COMPLETION_MESSAGES_BY_CATEGORY: Record<CompletionCategory, string[]> = {
  movie: [
    "一本の物語に、時間を預けました。",
    "今日は、ひとつの物語を最後まで見届けました。",
    "画面の中へ、少しだけ遠回りしました。",
  ],
  book: [
    "今日は、少しだけ本の中へ遠回りしました。",
    "誰かの言葉の中で、時間を過ごしました。",
    "ページの向こうに、少しだけ長くいました。",
  ],
  create: [
    "何もなかったところに、ひとつ残りました。",
    "今日は、手を動かす時間をつくりました。",
    "小さなものを、ひとつ生み出しました。",
  ],
  walk: [
    "今日の一歩が、いつもと違う場所へ連れていきました。",
    "知らない道を、少しだけ自分のものにしました。",
    "歩いた分だけ、今日が少し長くなりました。",
  ],
  outside: [
    "今日は、外の空気を少しだけ持ち帰りました。",
    "いつもの景色の外側を、少しだけ見ました。",
    "外に出たぶんだけ、今日が変わりました。",
  ],
  observe: [
    "見ているだけの時間も、今日の一部になりました。",
    "小さな何かに、少しだけ目を留めました。",
    "見過ごしていたものを、今日はひとつ拾いました。",
  ],
  social: [
    "今日は、誰かと少しだけ近づきました。",
    "ひとりでは終わらない時間を過ごしました。",
    "誰かのことを、今日は少し思いました。",
  ],
  quiet: [
    "何もしない時間が、今日を少し支えました。",
    "静かな時間が、今日のどこかに残りました。",
    "音を減らした分だけ、今日が少し広がりました。",
  ],
  home: [
    "いつもの部屋で、いつもと違う時間を過ごしました。",
    "家の中にも、今日の遠回りがありました。",
    "住み慣れた場所を、少しだけ整えました。",
  ],
  nostalgia: [
    "昔の自分に、少しだけ会いに行きました。",
    "忘れていた道を、今日は思い出しました。",
    "過去への遠回りも、今日の一部です。",
  ],
  nature: [
    "自然の時間に、少しだけ合わせてみました。",
    "空や風に、今日は少しだけ付き合いました。",
    "自然の中に、小さな遠回りを見つけました。",
  ],
  food: [
    "今日の一口が、少しだけ遠回りになりました。",
    "知らない味に、今日は少しだけ触れました。",
    "食べることも、今日はひとつの遠回りでした。",
  ],
};

const COMPLETION_MESSAGES_BY_MOOD: Record<Mood, string[]> = {
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

function pickDeterministic(pool: string[], dateKey: string): string {
  const index = ((dayNumber(dateKey) % pool.length) + pool.length) % pool.length;
  return pool[index];
}

function resolveCompletionCategory(mission: Mission): CompletionCategory {
  return mission.completionCategory ?? CATEGORY_TO_COMPLETION[mission.category];
}

export function getCompletionMessage(
  mission: Mission | null | undefined,
  mood: Mood | null | undefined,
  dateKey: string
): string {
  if (mission) {
    const category = resolveCompletionCategory(mission);
    const pool = COMPLETION_MESSAGES_BY_CATEGORY[category];
    if (pool?.length) return pickDeterministic(pool, dateKey);
  }
  if (mood) {
    const pool = COMPLETION_MESSAGES_BY_MOOD[mood];
    if (pool?.length) return pickDeterministic(pool, dateKey);
  }
  return FALLBACK_MESSAGE;
}
