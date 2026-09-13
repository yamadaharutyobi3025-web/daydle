"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { resetTodayForDevTesting } from "@/lib/storage";
import { clearTodayContext } from "@/lib/todayContext";

/**
 * 開発環境専用。今日のsituation/feeling/missionId/完了状態だけを
 * この端末のローカル状態からリセットし、/ の状況→気分の2問から
 * 再テストできるようにする。Supabase上のpost/follow/notification等は
 * 一切操作しない。
 *
 * このコンポーネント自体はNODE_ENVを見ていない。表示するページ側
 * （app/dev-login/page.tsx）がサーバーコンポーネントで
 * NODE_ENV!=="development"ならnotFound()にしているため、本番ビルドでは
 * ページごと404になりこのコンポーネントはレンダリングされない。
 */
export function DevResetTodayButton() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  function handleReset() {
    setIsResetting(true);
    try {
      resetTodayForDevTesting();
      clearTodayContext();
      router.push("/");
      router.refresh();
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="mt-12 border-t border-line/60 pt-6">
      <p className="text-xs tracking-wide text-ink-soft/60">開発用</p>
      <Button
        variant="ghost"
        className="mt-3 w-full"
        onClick={handleReset}
        disabled={isResetting}
      >
        {isResetting ? "リセット中…" : "今日をリセット（開発用）"}
      </Button>
      <p className="mt-3 text-xs leading-[1.8] text-ink-soft/60">
        今日選んだ状況・気分・ミッション・完了状態を、この端末上だけで消します。
        投稿・フォロー・通知などのSupabase上のデータは削除されません。
      </p>
    </div>
  );
}
