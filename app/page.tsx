"use client";

import { useState } from "react";
import { WelcomeFlow } from "@/components/WelcomeFlow";
import { TodayScreen } from "@/components/TodayScreen";
import { getTodayMission, type TodayMissionState } from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { Logo } from "@/components/Logo";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const today = useClientSnapshot<TodayMissionState | null>(() => {
    // refreshKeyを読むことで、WelcomeFlow完了後に再取得させる
    void refreshKey;
    return getTodayMission();
  });

  if (today === UNLOADED) {
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

  return <WelcomeFlow onReady={() => setRefreshKey((k) => k + 1)} />;
}
