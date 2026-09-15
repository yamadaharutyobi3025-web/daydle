/**
 * 「今この端末のローカルデータ（daydle_state_v1・daydle_today_context_v1・
 * IndexedDBの写真）は、どのSupabaseアカウント向けのものか」を1つの
 * marker（未ログインなら"anonymous"）として端末に記録し、ログイン中の
 * アカウントがそのmarkerと食い違ったら（＝別アカウントへの切り替わり）
 * ローカルの個人データを全消去するための仕組み。
 *
 * 背景: 「今日」「記録」「写真」は元々ログイン不要のローカルファースト機能
 * として作られており、daydle_state_v1（lib/storage.ts）・
 * daydle_today_context_v1（lib/todayContext.ts）・IndexedDBの写真
 * （lib/photoStore.ts）はいずれもuser_idで区別されない、端末単位の
 * 単一データとして保存されている。そのため、同じ端末で複数のSupabase
 * アカウントを使う（ログアウト→別アカウントでログイン、/dev-loginでの
 * アカウント切り替え、セッションの入れ替わり等）と、前のアカウントの
 * 「今日」「記録」「写真」が次のアカウントにもそのまま見えてしまう
 * （データ境界がアカウントではなく端末になっている）。
 *
 * このモジュールは、その根本原因そのもの（ローカルデータが
 * user_idを持たないこと）は変えず、「アカウントが変わった瞬間に
 * ローカルの個人データを全消去する」ことで、以後の閲覧・書き込みが
 * 前のアカウントのデータを引き継がないようにする、最小限の防御策。
 * 呼び出し側はcomponents/SocialSync.tsx（AppChrome経由で全ページに常駐）。
 * applyAccountBoundaryGuard()の完了を待ってから
 * syncTodayCompletionIfNeeded()を呼ぶ必要がある（消去前にhasCompletedToday()
 * を読むと、前のアカウントの完了状態を新アカウントのdaily_completionsへ
 * 誤って同期してしまうため）。
 */

const OWNER_MARKER_KEY = "daydle_local_owner_v1";

/** 未ログイン状態を表す固定のmarker値。 */
export const ANONYMOUS_MARKER = "anonymous";

/**
 * 現在ログインしているユーザーのidから、比較用markerを作る。
 * 未ログインならANONYMOUS_MARKERを返す。
 */
export function ownerMarkerFor(userId: string | null): string {
  return userId ?? ANONYMOUS_MARKER;
}

/**
 * 前回記録したmarkerと、今回のmarkerを比較し、ローカルの個人データを
 * 消すべきかどうかを判定する（副作用なし、純粋関数）。
 *
 * - storedMarker が null（＝この端末でまだ一度もmarkerを記録していない、
 *   この仕組み導入前からの既存ユーザーを含む）の場合は、消さない。
 *   既存のローカルデータ（匿名時代のものを含む）を壊さないため。
 * - storedMarker と currentMarker が一致する場合は、同じアカウント
 *   （または同じ未ログイン状態）が続いているだけなので消さない。
 * - storedMarker が匿名(ANONYMOUS_MARKER)で、currentMarkerが具体的な
 *   アカウントの場合は「匿名で使っていた端末で初めてログインした」
 *   ＝そのアカウントが既存のローカル履歴を引き継ぐ、自然な遷移として
 *   消さない。以後そのアカウントの履歴として扱われる。
 * - それ以外（具体的なアカウントAから別のB、またはAからログアウトして
 *   匿名に戻る）は、アカウントの境界をまたいだとみなして消す。
 *   ログアウトも対象に含めるのは、Aのデータを「次に使う人（匿名の
 *   誰か、または別アカウント）」に一切引き継がせないため。
 */
export function shouldClearOnOwnerChange(
  storedMarker: string | null,
  currentMarker: string
): boolean {
  if (storedMarker === null) return false;
  if (storedMarker === currentMarker) return false;
  if (storedMarker === ANONYMOUS_MARKER) return false;
  return true;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredOwnerMarker(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(OWNER_MARKER_KEY);
  } catch {
    return null;
  }
}

export function setStoredOwnerMarker(marker: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(OWNER_MARKER_KEY, marker);
  } catch {
    // 保存に失敗しても致命的ではない（次回また判定し直すだけ）
  }
}

export interface AccountBoundaryClearers {
  clearState: () => void;
  clearContext: () => void;
  clearPhotos: () => Promise<void>;
}

/**
 * ログイン中のユーザー（未ログインならnull）を渡すと、前回記録した
 * markerと比較し、必要なら個人データを全消去してからmarkerを更新する。
 * clearersを引数で受け取る設計にすることで、ブラウザ依存の関数
 * （lib/storage.ts・lib/todayContext.ts・lib/photoStore.ts）を
 * importしなくてもテストできるようにしている。
 */
export async function applyAccountBoundaryGuard(
  userId: string | null,
  clearers: AccountBoundaryClearers
): Promise<void> {
  const currentMarker = ownerMarkerFor(userId);
  const storedMarker = getStoredOwnerMarker();
  if (shouldClearOnOwnerChange(storedMarker, currentMarker)) {
    clearers.clearState();
    clearers.clearContext();
    await clearers.clearPhotos();
  }
  setStoredOwnerMarker(currentMarker);
}
