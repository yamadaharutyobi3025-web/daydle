"use client";

import { useState } from "react";
import { WelcomeFlow } from "@/components/WelcomeFlow";
import { TodayScreen } from "@/components/TodayScreen";
import { getTodayMission, hasCompletedToday, type TodayMissionState } from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const today = useClientSnapshot<TodayMissionState | null>(() => {
    // refreshKeyを読むことで、WelcomeFlow完了後に再取得させる
    void refreshKey;
    return getTodayMission();
  });
  const alreadyDone = useClientSnapshot<boolean>(() => {
    void refreshKey;
    return hasCompletedToday();
  });

  if (today === UNLOADED || alreadyDone === UNLOADED) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <Logo muted />
      </main>
    );
  }

  if (today) {
    return (
      <TodayScreen initial={today} onReset={() => setRefreshKey((k) => k + 1)} />
    );
  }

  // 1日1遠回り：todayが何らかの理由でnullでも、今日すでにcompletedの記録があれば
  // WelcomeFlowへは進ませない（今日/みんな/共有カード等、入口に関わらず共通の判定）。
  if (alreadyDone) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size="sm" muted />
        <p className="text-sm leading-loose text-ink-soft">今日はもう遠回りしました。</p>
      </main>
    );
  }

  return <WelcomeFlow onReady={() => setRefreshKey((k) => k + 1)} />;
}
