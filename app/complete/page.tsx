"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CurvedPath } from "@/components/CurvedPath";
import { PosterSignature } from "@/components/PosterSignature";
import { getTodayMission, type TodayMissionState } from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { getCompletionMessage } from "@/lib/completionMessages";
import { findMissionById } from "@/lib/missionSelector";
import { todayKey } from "@/lib/date";

export default function CompletePage() {
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());

  if (today === UNLOADED) return null;

  const mission = today ? findMissionById(today.missionId) : undefined;
  const message = getCompletionMessage(mission, today?.mood, today?.date ?? todayKey());

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <Logo size="sm" muted />
        <p className="mt-14 font-serif-jp text-[24px] leading-[1.9] text-ink">{message}</p>
        <CurvedPath className="mt-12 h-7 w-36 text-sage/80" />
        <PosterSignature className="mt-6" />
      </div>

      <div className="mt-16 flex items-center gap-6">
        <Link
          href="/record"
          className="relative z-10 touch-manipulation text-xs text-ink-soft/60"
        >
          <span className="absolute -inset-3" aria-hidden="true" />
          記録を見る
        </Link>
        <Link
          href="/post/new"
          className="relative z-10 touch-manipulation text-xs text-ink-soft/60"
        >
          <span className="absolute -inset-3" aria-hidden="true" />
          投稿する
        </Link>
      </div>
    </main>
  );
}
