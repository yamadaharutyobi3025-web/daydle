/** ローカルタイムゾーンでの日付キー（YYYY-MM-DD）を返す。 */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/** 日付キーを日単位の連番に変換する（コミュニティの日替わり選出に使う）。 */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** "2026-09-10" -> "9月10日" */
export function formatJapaneseDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${m}月${d}日`;
}

/** ミリ秒 -> "05:00" のようなカウントダウン表示。負の値は0扱い。 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
