"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { syncTodayCompletionIfNeeded } from "@/lib/socialSync";

/**
 * 画面には何も表示しない。ログイン済みなら、今日の完了状態を
 * daily_completionsへ同期する（詳細はlib/socialSync.ts参照）。
 * Socialを使っていない（未ログイン、またはSupabase未設定の）
 * ユーザーには何もしない。
 */
export function SocialSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) {
        void syncTodayCompletionIfNeeded(supabase, data.user.id);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void syncTodayCompletionIfNeeded(supabase, session.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
