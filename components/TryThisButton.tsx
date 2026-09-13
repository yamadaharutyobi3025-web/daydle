"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hasCompletedToday, setTodayMission } from "@/lib/storage";
import { importPostAsMission } from "@/lib/socialMissions";
import { todayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";
import type { PhoneMode } from "@/types/mission";

/**
 * 「私もやってみる」。いいねではなく、その投稿の遠回りを自分の
 * 「今日の候補」として採用するための機能。書き込むのはローカルの
 * today状態だけで、Supabase側（元の投稿・プロフィール）は一切変更しない。
 *
 * 1日1遠回りは共通ルールなので、今日の画面と同じ hasCompletedToday() で
 * 判定する（サーバー側のdaily_completionsとの整合はlib/socialSync.tsが
 * ログイン時に別途取っている）。
 */
export function TryThisButton({
  post,
}: {
  post: {
    id: string;
    mission_text: string;
    duration_minutes: number;
    phone_mode: PhoneMode;
    allowed_tools: string[];
  };
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  function handleClick() {
    if (hasCompletedToday()) {
      setBlocked(true);
      return;
    }

    const mission = importPostAsMission(post);
    setTodayMission({
      date: todayKey(),
      missionId: mission.id,
      candidateIds: [mission.id],
      currentIndex: 0,
      rerollCount: 0,
      status: "pending",
    });
    trackEvent("social_mission_adopted", { missionId: mission.id });
    router.push("/");
  }

  if (blocked) {
    return (
      <p className="relative z-10 mt-3 text-xs text-ink-soft/60">
        今日はもう遠回りしました。
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative z-10 mt-3 touch-manipulation rounded-full bg-sage-soft/70 px-3.5 py-1 text-[12px] text-sage-deep transition-colors hover:bg-sage-soft"
    >
      私もやってみる
    </button>
  );
}
