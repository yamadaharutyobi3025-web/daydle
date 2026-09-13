"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import type { Situation, Feeling } from "@/types/context";
import { selectByStateAndFeeling } from "@/lib/missionSelector";
import { getTodayContext, saveTodaySituation, saveTodayFeeling } from "@/lib/todayContext";
import { setTodayMission } from "@/lib/storage";
import { todayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";

const SITUATION_OPTIONS: { value: Situation; label: string }[] = [
  { value: "home", label: "家にいる" },
  { value: "outside", label: "外にいる" },
  { value: "transit", label: "移動中" },
  { value: "work_school", label: "仕事・学校の合間" },
  { value: "unsure", label: "特に決まっていない" },
];

const FEELING_OPTIONS: { value: Feeling; label: string }[] = [
  { value: "tired", label: "少し疲れている" },
  { value: "bored", label: "退屈している" },
  { value: "calm_seeking", label: "落ち着きたい" },
  { value: "want_to_do_something", label: "何かしたい" },
  { value: "good_mood", label: "気分がいい" },
  { value: "neutral", label: "なんとなく" },
];

function ChipRow<V extends string>({
  options,
  active,
  onSelect,
  className = "",
}: {
  options: { value: V; label: string }[];
  active: V | null;
  onSelect: (value: V) => void;
  className?: string;
}) {
  return (
    <div className={`mt-10 flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
            active === opt.value
              ? "bg-sage-soft text-sage-deep"
              : "bg-cream-deep/50 text-ink-soft"
          }`}
        >
          <span className="absolute -inset-1.5" aria-hidden="true" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative z-10 touch-manipulation self-start text-xs text-ink-soft/60 underline underline-offset-4"
    >
      <span className="absolute -inset-3" aria-hidden="true" />
      戻る
    </button>
  );
}

/**
 * 「今日」の入り口。① 今の状況を聞く → ② 今の気分を聞く → ③ その組み合わせに
 * 合う遠回りを1つ決める、という2問だけの流れ。
 *
 * ここで決まるのは既存のTodayMissionState（missionId/candidateIds/status）
 * そのものなので、決定後の画面（today/timer/complete/記録/1日1回制限）は
 * 一切変更していない。既存のContext Engine（v1: place/schedule/social）
 * ・selectDailyCandidates・saveContextはそのまま残し、この新しい入り口
 * からは呼ばない。
 *
 * 状況・気分の途中経過はlib/todayContext.tsに保存しているため、
 * リロードしても質問の続きから復帰できる（today自体がまだ決まって
 * いない間だけ有効。dateが変われば自動的にリセットされる）。
 */
export function WelcomeFlow({ onReady }: { onReady: () => void }) {
  const initial = getTodayContext();
  const [situation, setSituation] = useState<Situation | null>(initial.situation);
  const [feeling, setFeeling] = useState<Feeling | null>(initial.feeling);

  function chooseSituation(value: Situation) {
    setSituation(value);
    saveTodaySituation(value);
  }

  function chooseFeeling(value: Feeling) {
    if (!situation) return;
    setFeeling(value);
    saveTodayFeeling(value);

    const candidateIds = selectByStateAndFeeling(situation, value);
    if (candidateIds.length === 0) return;

    setTodayMission({
      date: todayKey(),
      missionId: candidateIds[0],
      candidateIds,
      currentIndex: 0,
      rerollCount: 0,
      status: "pending",
      mood: null,
    });
    trackEvent("mission_viewed", { missionId: candidateIds[0], situation, feeling: value });
    onReady();
  }

  if (situation === null) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
        <div className="flex flex-1 flex-col animate-fade-in">
          <header>
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

          <section className="mt-12">
            <p className="text-[15px] leading-[1.8] text-ink">今、どんな状況？</p>
            <ChipRow options={SITUATION_OPTIONS} active={situation} onSelect={chooseSituation} />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <div className="flex flex-1 flex-col animate-fade-in">
        <BackLink onClick={() => setSituation(null)} />
        <div className="mt-10 flex flex-col items-center text-center">
          <Logo size="sm" muted />
          <p className="mt-10 font-serif-jp text-[22px] leading-[1.8] text-ink">
            今、どんな気分？
          </p>
        </div>
        <ChipRow
          options={FEELING_OPTIONS}
          active={feeling}
          onSelect={chooseFeeling}
          className="justify-center"
        />
      </div>
    </main>
  );
}
