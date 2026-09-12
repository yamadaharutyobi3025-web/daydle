"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CurvedPath } from "@/components/CurvedPath";
import { PosterSignature } from "@/components/PosterSignature";
import { findMissionById } from "@/lib/missionSelector";
import { getTodayMission, type TodayMissionState } from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import type { PhoneMode } from "@/types/mission";

const copy: Record<PhoneMode, { main: string; sub: string }> = {
  offline: {
    main: "では、\nスマホを閉じてください。",
    sub: "今日の遠回りは、現実の中にあります。",
  },
  tool: {
    main: "必要なときだけ、\nスマホを使ってください。",
    sub: "用事が終わったら、またポケットへ。",
  },
  connect: {
    main: "連絡をしたら、\nこのアプリに戻らなくても大丈夫です。",
    sub: "",
  },
};

export default function StartPage() {
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());

  if (today === UNLOADED) return null;

  const mission = today ? findMissionById(today.missionId) : undefined;

  if (!mission) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">今日の遠回りが見つかりませんでした。</p>
        <Link
          href="/"
          className="touch-manipulation -mx-3 -my-3 px-3 py-3 text-sm underline underline-offset-4 text-ink-soft"
        >
          今日の遠回りを見る
        </Link>
      </main>
    );
  }

  const text = copy[mission.phoneMode];

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <Logo size="sm" muted />
        <p className="mt-14 whitespace-pre-line font-serif-jp text-[24px] leading-[1.9] text-ink">
          {text.main}
        </p>
        {text.sub && (
          <p className="mt-6 text-[13px] leading-loose text-ink-soft">{text.sub}</p>
        )}
        <CurvedPath className="mt-12 h-7 w-36 text-sage/80" />
        <PosterSignature className="mt-6" />
      </div>

      <Link
        href="/"
        className="relative z-10 mt-16 touch-manipulation text-xs text-ink-soft/60"
      >
        <span className="absolute -inset-3" aria-hidden="true" />
        今日の遠回りに戻る
      </Link>
    </main>
  );
}
