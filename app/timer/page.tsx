"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CurvedPath } from "@/components/CurvedPath";
import { PosterSignature } from "@/components/PosterSignature";
import { Button } from "@/components/Button";
import { findMissionById } from "@/lib/missionSelector";
import {
  getTodayMission,
  recordTodayHistory,
  updateTodayMission,
  type TodayMissionState,
} from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { formatCountdown } from "@/lib/date";
import { trackEvent } from "@/lib/track";

export default function TimerPage() {
  const router = useRouter();
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (today === UNLOADED) return null;

  const mission = today ? findMissionById(today.missionId) : undefined;
  const timer = today?.timer;

  if (!today || !mission || !timer) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">タイマーはまだ始まっていません。</p>
        <Link
          href="/start"
          className="touch-manipulation -mx-3 -my-3 px-3 py-3 text-sm underline underline-offset-4 text-ink-soft"
        >
          ミッション開始画面に戻る
        </Link>
      </main>
    );
  }

  const remainingMs = timer.endsAt - now;
  const isDone = remainingMs <= 0;

  function handleComplete() {
    if (!today || today === UNLOADED) return;
    updateTodayMission((c) => ({ ...c, status: "completed" }));
    recordTodayHistory({
      date: today.date,
      missionId: today.missionId,
      status: "completed",
      reflection: null,
    });
    trackEvent("mission_completed", { missionId: today.missionId });
    router.push("/journal");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <Logo size="sm" muted />
        <p className="mt-14 font-serif-jp text-[52px] tabular-nums leading-none text-ink">
          {formatCountdown(remainingMs)}
        </p>
        <p className="mt-8 text-[13px] leading-loose text-ink-soft">
          {isDone ? (
            "そろそろ、戻ってきても大丈夫です。"
          ) : (
            <>
              スマホを閉じて、
              <br />
              今日の遠回りへ。
            </>
          )}
        </p>
        <CurvedPath className="mt-12 h-7 w-36 text-sage/80" />
        <PosterSignature className="mt-6" />
      </div>

      <Button onClick={handleComplete} className="mt-16 w-full">
        できた
      </Button>

      <Link
        href="/"
        className="relative z-10 mt-6 touch-manipulation text-xs text-ink-soft/60"
      >
        <span className="absolute -inset-3" aria-hidden="true" />
        今日の遠回りに戻る
      </Link>
    </main>
  );
}
