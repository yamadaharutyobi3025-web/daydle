"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { ContextPicker } from "@/components/ContextPicker";
import type { Mood } from "@/types/mission";
import type { PlaceContext, SchedulePressure, SocialContext } from "@/types/context";
import { selectDailyCandidates } from "@/lib/missionSelector";
import {
  getCompletedCount,
  getContext,
  getSeenUnlocks,
  markUnlockSeen,
  saveContext,
  setTodayMission,
} from "@/lib/storage";
import { getPendingUnlockNotice, getUnlockedMinutes } from "@/lib/unlocks";
import { todayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";

const moodOptions: { value: Mood; label: string }[] = [
  { value: "quiet", label: "静かに過ごしたい" },
  { value: "adventure", label: "少し冒険したい" },
  { value: "outside", label: "外に出たい" },
  { value: "home", label: "家にいたい" },
  { value: "people", label: "誰かと関わりたい" },
  { value: "empty", label: "何も考えたくない" },
];

export function WelcomeFlow({ onReady }: { onReady: () => void }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const canSubmit = minutes !== null && mood !== null;

  const completedCount = getCompletedCount();
  const timeOptions = getUnlockedMinutes(completedCount);
  const pendingUnlock = getPendingUnlockNotice(completedCount, getSeenUnlocks());

  // Context Engine: 初回はnull（未設定）のまま扱い、時間×気分だけの従来ロジックで選ぶ。
  // 2回目以降は、前回ユーザーが実際に選んだ値だけを初期値として引き継ぐ。
  const savedContext = getContext();
  const [placeContext, setPlaceContext] = useState<PlaceContext | null>(
    savedContext.lastPlaceContext
  );
  const [schedulePressure, setSchedulePressure] = useState<SchedulePressure | null>(
    savedContext.lastSchedulePressure
  );
  const [socialContext, setSocialContext] = useState<SocialContext | null>(
    savedContext.lastSocialContext
  );

  useEffect(() => {
    if (pendingUnlock) markUnlockSeen(pendingUnlock.minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUnlock?.minutes]);

  function handleSubmit() {
    if (minutes === null || mood === null) return;
    const candidates = selectDailyCandidates({
      minutes,
      moods: [mood],
      placeContext,
      schedulePressure,
      socialContext,
    });
    if (candidates.length === 0) return;

    // ユーザーが一度も「いまの状況」に触れていない場合は何も保存しない
    // （nullのままにして、次回も従来ロジックのままにする）。
    if (placeContext !== null || schedulePressure !== null || socialContext !== null) {
      saveContext({
        lastPlaceContext: placeContext,
        lastSchedulePressure: schedulePressure,
        lastSocialContext: socialContext,
      });
    }

    setTodayMission({
      date: todayKey(),
      missionId: candidates[0].id,
      candidateIds: candidates.map((c) => c.id),
      currentIndex: 0,
      rerollCount: 0,
      status: "pending",
      mood,
    });
    trackEvent("mission_viewed", { missionId: candidates[0].id, minutes, mood });
    onReady();
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <header className="animate-fade-in">
        <Logo size="md" />
        <h1 className="mt-8 font-serif-jp text-[26px] leading-[1.6] text-ink">
          ちゃんと、
          <br />
          時間を無駄にしよう。
        </h1>
        <p className="mt-4 text-sm leading-[1.9] text-ink-soft">
          最短距離ばかりの人生に、
          <br />
          ちょっとだけ遠回りを。
        </p>
      </header>

      <p className="mt-10 text-sm leading-[1.9] text-ink-soft animate-fade-in">
        1日1つだけ。
        <br />
        いつもの日常を少しだけ外れる、
        <br />
        小さな遠回りを届けます。
      </p>

      {pendingUnlock && (
        <p className="mt-8 text-sm leading-[1.9] text-sage-deep animate-fade-in-slow">
          {pendingUnlock.message.main}
          <br />
          {pendingUnlock.message.sub}
        </p>
      )}

      <section className="mt-10">
        <p className="text-[13px] text-ink-soft">今日はどれくらい時間がありますか？</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {timeOptions.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
                minutes === m
                  ? "bg-sage-soft text-sage-deep"
                  : "bg-cream-deep/50 text-ink-soft"
              }`}
            >
              <span className="absolute -inset-1.5" aria-hidden="true" />
              {m}分
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[13px] text-ink-soft">今どんな気分ですか？</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {moodOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMood(opt.value)}
              className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
                mood === opt.value
                  ? "bg-sage-soft text-sage-deep"
                  : "bg-cream-deep/50 text-ink-soft"
              }`}
            >
              <span className="absolute -inset-1.5" aria-hidden="true" />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <ContextPicker
        placeContext={placeContext}
        schedulePressure={schedulePressure}
        socialContext={socialContext}
        onChangePlace={setPlaceContext}
        onChangeSchedule={setSchedulePressure}
        onChangeSocial={setSocialContext}
      />

      <div className="mt-auto pt-12">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
        >
          今日の遠回りをもらう
        </Button>
      </div>
    </main>
  );
}
