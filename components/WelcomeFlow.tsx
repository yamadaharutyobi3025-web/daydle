"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import type { Mood } from "@/types/mission";
import { selectDailyCandidates } from "@/lib/missionSelector";
import { setTodayMission } from "@/lib/storage";
import { todayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";

const timeOptions = [5, 15, 30, 60];

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

  function handleSubmit() {
    if (minutes === null || mood === null) return;
    const candidates = selectDailyCandidates({ minutes, moods: [mood] });
    if (candidates.length === 0) return;

    setTodayMission({
      date: todayKey(),
      missionId: candidates[0].id,
      candidateIds: candidates.map((c) => c.id),
      currentIndex: 0,
      rerollCount: 0,
      status: "pending",
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
