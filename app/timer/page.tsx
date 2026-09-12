"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  getNotificationPermission,
  playChime,
  requestNotificationPermission,
  showTimerNotification,
  vibrateSoftly,
} from "@/lib/timerAlert";
import type { PhoneMode } from "@/types/mission";

const copy: Record<PhoneMode, string> = {
  offline: "スマホを閉じて、\n今日の遠回りへ。",
  tool: "必要なときだけ、\nスマホを使ってください。",
  connect: "連絡をしたら、\n戻らなくても大丈夫です。",
};

const DONE_MESSAGE = "そろそろ、\n戻ってきても大丈夫です。";

export default function TimerPage() {
  const router = useRouter();
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());
  const [now, setNow] = useState(() => Date.now());
  const [notifyTick, setNotifyTick] = useState(0);
  const notifyPermission = useClientSnapshot<NotificationPermission | null>(() => {
    void notifyTick;
    return getNotificationPermission();
  });
  const hasFiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const mission = today && today !== UNLOADED ? findMissionById(today.missionId) : undefined;
  const timer = today && today !== UNLOADED ? today.timer : undefined;
  const remainingMs = timer ? timer.endsAt - now : 0;
  const isDone = Boolean(timer) && remainingMs <= 0;

  useEffect(() => {
    if (!isDone || hasFiredRef.current) return;
    hasFiredRef.current = true;
    playChime();
    vibrateSoftly();
    showTimerNotification("そろそろ、戻ってきても大丈夫です。");
  }, [isDone]);

  if (today === UNLOADED) return null;

  if (!today || !mission || !timer) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">タイマーはまだ始まっていません。</p>
        <Link
          href="/"
          className="touch-manipulation -mx-3 -my-3 px-3 py-3 text-sm underline underline-offset-4 text-ink-soft"
        >
          今日の遠回りを見る
        </Link>
      </main>
    );
  }

  async function handleEnableNotify() {
    await requestNotificationPermission();
    setNotifyTick((t) => t + 1);
  }

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

        <p className="mt-10 text-xs tracking-[0.2em] text-sage-deep">今日の遠回り</p>
        <p className="mt-4 font-serif-jp text-[18px] leading-[1.8] text-ink">
          {mission.description}
        </p>

        <p className="mt-8 font-serif-jp text-[52px] tabular-nums leading-none text-ink">
          {formatCountdown(remainingMs)}
        </p>
        <p className="mt-6 whitespace-pre-line text-[13px] leading-loose text-ink-soft">
          {isDone ? DONE_MESSAGE : copy[mission.phoneMode]}
        </p>

        {notifyPermission === "default" && (
          <button
            type="button"
            onClick={handleEnableNotify}
            className="relative z-10 mt-4 touch-manipulation -mx-3 -my-2 px-3 py-2 text-[11px] text-ink-soft/60 underline underline-offset-4"
          >
            終了を通知で知らせる
          </button>
        )}

        <CurvedPath className="mt-10 h-7 w-36 text-sage/80" />
        <PosterSignature className="mt-6" />
      </div>

      <Button onClick={handleComplete} className="mt-14 w-full">
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
