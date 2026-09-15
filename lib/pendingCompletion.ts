/**
 * 「できた」を押した時点で未ログインだった場合に、ログイン（メールの
 * マジックリンク経由の場合は画面遷移をまたぐ）から戻ってきたあと、
 * 元の完了処理を自動で再開するための小さな目印。
 *
 * 保存するのは「どの日付・どのmissionを完了させようとしていたか」だけ。
 * 実際の完了処理（journal_entriesへの書き込み）は呼び出し側
 * （components/TodayScreen.tsx）が、ログイン確認後にあらためて行う。
 */
const KEY = "daydle_pending_complete_v1";

export interface PendingCompletion {
  date: string;
  missionId: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getPendingCompletion(): PendingCompletion | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PendingCompletion).date === "string" &&
      typeof (parsed as PendingCompletion).missionId === "string"
    ) {
      return parsed as PendingCompletion;
    }
    return null;
  } catch {
    return null;
  }
}

export function setPendingCompletion(value: PendingCompletion): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // 保存に失敗してもログイン画面への遷移自体は止めない
  }
}

export function clearPendingCompletion(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 削除に失敗しても致命的ではない
  }
}
