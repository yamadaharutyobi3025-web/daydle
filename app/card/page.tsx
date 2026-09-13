"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { Logo } from "@/components/Logo";
import { Scenery } from "@/components/Scenery";
import { PosterSignature } from "@/components/PosterSignature";
import { findMissionById } from "@/lib/missionSelector";
import { getTodayMission, type TodayMissionState } from "@/lib/storage";
import { formatDurationLabel } from "@/lib/durationDisplay";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { formatJapaneseDate } from "@/lib/date";
import { trackEvent } from "@/lib/track";

export default function CardPage() {
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());
  const mission = today && today !== UNLOADED ? findMissionById(today.missionId) : undefined;

  useEffect(() => {
    if (mission) trackEvent("card_mode_opened", { missionId: mission.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.id]);

  if (today === UNLOADED) return null;

  if (!mission || !today) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">今日の遠回りが見つかりませんでした。</p>
        <Link
          href="/"
          className="relative z-10 touch-manipulation text-sm text-ink-soft underline underline-offset-4"
        >
          <span className="absolute -inset-3" aria-hidden="true" />
          戻る
        </Link>
      </main>
    );
  }

  const dateLabel = formatJapaneseDate(today.date);

  return (
    <main className="bg-grain relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden bg-cream px-8 py-16">
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 touch-manipulation text-xs text-ink-soft/50"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <span className="absolute -inset-3" aria-hidden="true" />
        戻る
      </Link>

      <div className="relative z-10 flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-14 pb-16 text-center animate-fade-in-slow">
        <Logo size="sm" muted />

        <div>
          <p className="text-xs tracking-[0.25em] text-sage-deep">今日の遠回り</p>
          <p className="mt-6 font-serif-jp text-[27px] leading-[1.95] text-ink">
            {mission.description}
          </p>
        </div>

        <div className="w-16 rule-hairline" />

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
              {formatDurationLabel(mission.duration, mission.displayDuration)}
            </span>
            <PhoneModeBadge phoneMode={mission.phoneMode} allowedTools={mission.allowedTools} />
          </div>
          <span className="text-xs text-ink-soft/60">{dateLabel}</span>
        </div>
      </div>

      <div className="relative z-10 mb-4 animate-fade-in-slow">
        <PosterSignature />
      </div>

      <Scenery className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 w-full text-sage/[0.12]" />
    </main>
  );
}
