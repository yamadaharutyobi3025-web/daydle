"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { Scenery } from "@/components/Scenery";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { getDailyCommunityMissions } from "@/lib/community";
import { todayKey } from "@/lib/date";
import { hasCompletedToday, setTodayMission } from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { trackEvent } from "@/lib/track";
import { communityMissionToMission } from "@/lib/missionSelector";
import type { CommunityMission } from "@/types/mission";

export default function CommunityPage() {
  const router = useRouter();
  const items: CommunityMission[] = getDailyCommunityMissions(todayKey());
  const alreadyDone = useClientSnapshot<boolean>(() => hasCompletedToday());

  useEffect(() => {
    trackEvent("community_viewed");
  }, []);

  function handleAdopt(mission: CommunityMission) {
    // 1日1遠回り：今日すでにcompletedなら、入口に関係なく新しいmissionは始めさせない。
    if (hasCompletedToday()) return;
    setTodayMission({
      date: todayKey(),
      missionId: mission.id,
      candidateIds: [mission.id],
      currentIndex: 0,
      rerollCount: 0,
      status: "pending",
    });
    trackEvent("community_mission_adopted", { missionId: mission.id });
    router.push("/");
  }

  if (alreadyDone === UNLOADED) return null;

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-16 pt-10">
      <header className="animate-fade-in">
        <Logo size="sm" muted />
        <h1 className="mt-7 font-serif-jp text-[21px] leading-relaxed text-ink">
          今日、誰かに出た遠回り
        </h1>
      </header>

      <ul className="mt-10 flex flex-col gap-20">
        {items.map((item, i) => (
          <li key={item.id} className="animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="font-serif-jp text-base italic leading-none text-sage-deep/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[10px] tracking-[0.28em] text-ink-soft/50">
                {item.location}
              </span>
            </div>
            <p className="mt-5 font-serif-jp text-[22px] leading-[1.95] text-ink">
              「{item.description}」
            </p>
            <div className="mt-5 flex items-center gap-2.5 text-ink-soft/45">
              <span className="text-[10px] tracking-wide">{item.duration} MIN</span>
              <span className="pointer-events-none text-[10px]">・</span>
              <PhoneModeBadge
                phoneMode={item.phoneMode}
                allowedTools={communityMissionToMission(item).allowedTools}
                variant="plain"
              />
            </div>
            {!alreadyDone && (
              <button
                type="button"
                onClick={() => handleAdopt(item)}
                className="relative z-10 mt-5 touch-manipulation rounded-full bg-sage-soft/70 px-3.5 py-1 text-[12px] text-sage-deep transition-colors hover:bg-sage-soft"
              >
                <span className="absolute -inset-3" aria-hidden="true" />
                私もやってみる
              </button>
            )}
          </li>
        ))}
      </ul>

      {alreadyDone ? (
        <p className="mt-10 pt-10 text-center text-xs text-ink-soft/60 animate-fade-in-slow">
          今日はもう遠回りしました。
        </p>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-10 pt-10 text-center animate-fade-in-slow">
          <Scenery className="h-10 w-40 text-sage/40" />
          <p className="font-serif-jp text-[19px] leading-[2] text-ink">
            今日はここまで。
            <br />
            <br />
            次はあなたが
            <br />
            遠回りする番です。
          </p>
          <Button onClick={() => router.push("/")}>今日の遠回りをもらう</Button>
        </div>
      )}
    </main>
  );
}
