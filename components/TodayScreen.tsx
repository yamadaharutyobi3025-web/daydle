"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MissionPoster } from "@/components/MissionPoster";
import { Button } from "@/components/Button";
import { findMissionById } from "@/lib/missionSelector";
import {
  clearTodayMission,
  recordTodayHistory,
  startMissionTimer,
  updateTodayMission,
  type TodayMissionState,
} from "@/lib/storage";
import { formatJapaneseDate } from "@/lib/date";
import { trackEvent } from "@/lib/track";
import { primeAudio } from "@/lib/timerAlert";
import { postIdFromMissionId } from "@/lib/socialMissions";
import { recordPostTryCompletion } from "@/lib/postTries";
import { MissionRatingWidget } from "@/components/MissionRatingWidget";

export function TodayScreen({
  initial,
  onReset,
}: {
  initial: TodayMissionState;
  onReset: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const mission = findMissionById(state.missionId);
  const dateLabel = formatJapaneseDate(state.date);
  const canReroll = state.currentIndex < state.candidateIds.length - 1;

  if (!mission) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">今日の遠回りが見つかりませんでした。</p>
        <Button
          onClick={() => {
            clearTodayMission();
            onReset();
          }}
        >
          今日の遠回りをもらう
        </Button>
      </main>
    );
  }

  function handleAccept() {
    if (!mission) return;
    primeAudio();
    updateTodayMission((c) => ({ ...c, status: "accepted" }));
    recordTodayHistory({
      date: state.date,
      missionId: state.missionId,
      status: "accepted",
      reflection: null,
    });
    startMissionTimer(mission.duration);
    trackEvent("mission_accepted", { missionId: state.missionId });
    router.push("/timer");
  }

  function handleComplete() {
    updateTodayMission((c) => ({ ...c, status: "completed" }));
    recordTodayHistory({
      date: state.date,
      missionId: state.missionId,
      status: "completed",
      reflection: null,
    });
    trackEvent("mission_completed", { missionId: state.missionId });

    // 「私もやってみる」で採用したミッションを実際に完了した時点でだけ、
    // 誰がやってみたかの記録を残す（採用しただけの時点では記録しない）。
    // 失敗しても完了フロー自体は止めない。
    const postId = postIdFromMissionId(state.missionId);
    if (postId) void recordPostTryCompletion(postId);

    router.push("/journal");
  }

  function handleDecline() {
    const next = updateTodayMission((c) => ({ ...c, status: "declined" }));
    recordTodayHistory({
      date: state.date,
      missionId: state.missionId,
      status: "declined",
      reflection: "skipped",
    });
    trackEvent("mission_skipped", { missionId: state.missionId });
    if (next) setState(next);
  }

  function handleReroll() {
    if (!canReroll) return;
    const nextIndex = state.currentIndex + 1;
    const nextMissionId = state.candidateIds[nextIndex];
    const next = updateTodayMission((c) => ({
      ...c,
      currentIndex: nextIndex,
      missionId: nextMissionId,
      rerollCount: c.rerollCount + 1,
    }));
    trackEvent("mission_rerolled", { missionId: nextMissionId });
    if (next) setState(next);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-10">
      <div className="animate-fade-in flex-1">
        <MissionPoster mission={mission} dateLabel={dateLabel} />
      </div>

      <div className="relative z-10 mt-10 flex flex-col items-stretch gap-3 animate-fade-in-slow">
        {state.status === "pending" && (
          <>
            <Button onClick={handleAccept} className="w-full">
              やる
            </Button>
            <button
              type="button"
              onClick={handleDecline}
              className="touch-manipulation -my-2 py-4 text-center text-sm text-ink-soft/80"
            >
              今日はやらない
            </button>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink-soft/60">
              {canReroll && (
                <>
                  <button
                    type="button"
                    onClick={handleReroll}
                    className="touch-manipulation -mx-2 -my-3 px-2 py-3"
                  >
                    別の遠回りを見る
                  </button>
                  <span className="pointer-events-none text-line">・</span>
                </>
              )}
              <Link href="/card" className="touch-manipulation -mx-2 -my-3 px-2 py-3">
                カードで見る
              </Link>
            </div>
          </>
        )}

        {state.status === "accepted" && (
          <>
            <p className="text-center text-sm leading-loose text-ink-soft">
              今日はこの遠回りへ向かっています。
            </p>
            <Button onClick={handleComplete} className="mt-2 w-full">
              できた
            </Button>
            <div className="mt-1 flex items-center justify-center gap-4 text-xs text-ink-soft/60">
              <Link href="/timer" className="touch-manipulation -mx-2 -my-3 px-2 py-3">
                タイマーを見る
              </Link>
              <span className="pointer-events-none text-line">・</span>
              <Link href="/card" className="touch-manipulation -mx-2 -my-3 px-2 py-3">
                カードで見る
              </Link>
            </div>
          </>
        )}

        {state.status === "completed" && (
          <>
            <p className="text-center text-sm leading-loose text-ink-soft">
              今日の遠回りは、もう終えています。
            </p>
            <Link href="/post/new">
              <Button variant="ghost" className="w-full">
                今日の遠回りを投稿する
              </Button>
            </Link>
            <div className="mt-1 flex items-center justify-center gap-4 text-xs text-ink-soft/60">
              <Link href="/record" className="touch-manipulation -mx-2 -my-3 px-2 py-3">
                記録を見る
              </Link>
              <span className="pointer-events-none text-line">・</span>
              <Link href="/card" className="touch-manipulation -mx-2 -my-3 px-2 py-3">
                カードで見る
              </Link>
            </div>
          </>
        )}

        {state.status === "declined" && (
          <p className="text-center text-sm leading-loose text-ink-soft">
            また今度で大丈夫です。
          </p>
        )}
      </div>

      <MissionRatingWidget mission={mission} />
    </main>
  );
}
