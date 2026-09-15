"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { clearAllLocalPersonalData } from "@/lib/storage";
import { clearTodayContext } from "@/lib/todayContext";
import { clearAllPhotos } from "@/lib/photoStore";

/**
 * 開発環境専用・一回限りの後始末用ボタン。
 *
 * journal_entriesをSupabaseへ移す前は、「今日」「記録」「写真」が
 * user_idを持たない端末単位のローカルデータだったため、実ユーザーテスト
 * より前の開発・検証中に複数アカウントを行き来した端末には、所有者の
 * 判別できない旧データが残っている可能性がある。
 *
 * lib/accountBoundary.tsの自動判定（アカウントが変わった瞬間に消す）は
 * 導入後の切り替えにしか効かないため、導入前からの混在データはここで
 * 手動で一度だけ消す。既存ユーザーへの自動移行は行わない（山田・井出の
 * どちらのデータか特定できないため、どちらにも引き継がせない）。
 *
 * 消すのはこの端末のlocalStorage/IndexedDBだけで、Supabase上の
 * journal_entries/posts/follows/notifications等には一切触れない。
 */
export function DevClearLegacyDataButton() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    if (
      !window.confirm(
        "この端末に残っている旧ローカルDAYDLEデータ（今日の状態・記録・写真）をすべて削除します。よろしいですか？"
      )
    ) {
      return;
    }
    setIsClearing(true);
    try {
      clearAllLocalPersonalData();
      clearTodayContext();
      await clearAllPhotos();
      router.push("/");
      router.refresh();
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="mt-6">
      <Button
        variant="ghost"
        className="w-full"
        onClick={handleClear}
        disabled={isClearing}
      >
        {isClearing ? "削除中…" : "旧ローカルDAYDLEデータを削除"}
      </Button>
      <p className="mt-3 text-xs leading-[1.8] text-ink-soft/60">
        実ユーザーテスト開始前に一度だけ実行してください。この端末のlocalStorage・
        IndexedDBだけを消します（journal_entries移行前の、所有者が特定できない
        記録・写真の後始末用）。Supabase上のデータは削除されません。
      </p>
    </div>
  );
}
