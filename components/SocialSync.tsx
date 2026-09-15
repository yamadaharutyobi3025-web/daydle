"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { syncTodayCompletionIfNeeded } from "@/lib/socialSync";
import { applyAccountBoundaryGuard } from "@/lib/accountBoundary";
import { clearAllLocalPersonalData } from "@/lib/storage";
import { clearTodayContext } from "@/lib/todayContext";
import { clearAllPhotos } from "@/lib/photoStore";

/**
 * 画面には何も表示しない。全ページ共通で2つの役割を持つ：
 *
 * 1. アカウント境界の防御（lib/accountBoundary.ts）：「今日」「記録」
 *    「写真」はuser_idを持たない端末単位のローカルデータのため、
 *    ログイン中のアカウントが前回と変わっていたら（ログアウト、
 *    別アカウントへのログイン、/dev-loginでの切り替え等）先にローカルの
 *    個人データを全消去する。これを済ませてからでないと、下記2.が
 *    「前のアカウントの完了状態」を新アカウントのdaily_completionsへ
 *    誤って同期してしまう。
 * 2. ログイン済みなら、今日の完了状態をdaily_completionsへ同期する
 *    （詳細はlib/socialSync.ts参照）。
 *
 * Socialを使っていない（未ログイン、またはSupabase未設定の）
 * ユーザーには2.は何もしない（1.は未ログインでも、アカウント境界を
 * またいだかどうかの判定自体は行う＝ログアウト直後の消去はここで起きる）。
 */
export function SocialSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    let cancelled = false;

    async function handleUser(userId: string | null) {
      await applyAccountBoundaryGuard(userId, {
        clearState: clearAllLocalPersonalData,
        clearContext: clearTodayContext,
        clearPhotos: clearAllPhotos,
      });
      if (!cancelled && userId) {
        await syncTodayCompletionIfNeeded(supabase, userId);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) void handleUser(data.user?.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void handleUser(session?.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
