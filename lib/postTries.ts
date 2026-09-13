import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * 「私もやってみる」で採用した投稿を、実際に完了した時点でだけ記録する
 * （採用しただけ＝ボタンを押しただけの時点ではまだ何も記録しない）。
 *
 * ログインしていない場合は何もしない。匿名ユーザーの完了はこの機能の
 * 対象外とし、後から遡って紐づけることもしない（誰の完了か特定できる
 * 情報がないため）。失敗しても完了フロー自体は止めない
 * （best-effort、握りつぶす）。
 */
export async function recordPostTryCompletion(postId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("post_tries")
      .upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true }
      );
  } catch (err) {
    console.error("recordPostTryCompletion failed", err);
  }
}
