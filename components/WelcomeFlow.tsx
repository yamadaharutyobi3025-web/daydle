"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
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

type Step = 0 | 1 | 2 | 3 | 4;

const PLACE_OPTIONS: { value: PlaceContext; label: string }[] = [
  { value: "home", label: "家" },
  { value: "work_school", label: "仕事・学校" },
  { value: "outside", label: "外出中" },
  { value: "transit", label: "移動中" },
];

const SCHEDULE_OPTIONS: { value: SchedulePressure; label: string }[] = [
  { value: "soon_busy", label: "すぐ予定がある" },
  { value: "some_time", label: "少し時間がある" },
  { value: "free", label: "今日は余裕がある" },
];

const SOCIAL_OPTIONS: { value: SocialContext; label: string }[] = [
  { value: "alone", label: "ひとり" },
  { value: "with_someone", label: "誰かといる" },
];

const moodOptions: { value: Mood; label: string }[] = [
  { value: "quiet", label: "静かに過ごしたい" },
  { value: "adventure", label: "少し冒険したい" },
  { value: "outside", label: "外に出たい" },
  { value: "home", label: "家にいたい" },
  { value: "people", label: "誰かと関わりたい" },
  { value: "empty", label: "何も考えたくない" },
];

/**
 * 選択済みにはしない。前回選んだ値を先頭に持ってくるだけの並び順ヒント。
 */
function reorderByLast<V extends string>(
  options: { value: V; label: string }[],
  last: V | null
): { value: V; label: string }[] {
  if (!last) return options;
  const idx = options.findIndex((o) => o.value === last);
  if (idx <= 0) return options;
  const copy = [...options];
  const [item] = copy.splice(idx, 1);
  copy.unshift(item);
  return copy;
}

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

export function WelcomeFlow({ onReady }: { onReady: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [placeContext, setPlaceContext] = useState<PlaceContext | null>(null);
  const [schedulePressure, setSchedulePressure] = useState<SchedulePressure | null>(null);
  const [socialContext, setSocialContext] = useState<SocialContext | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);

  // 5項目すべてが明示的に回答されるまでは、missionSelectorを呼ばせない・CTAも押させない。
  // home/some_time/aloneなどの仮定は行わない（前回値は並び順のヒントにしか使わない）。
  const canSubmit =
    placeContext !== null &&
    schedulePressure !== null &&
    socialContext !== null &&
    mood !== null &&
    minutes !== null;

  const completedCount = getCompletedCount();
  const timeOptions = getUnlockedMinutes(completedCount);
  const pendingUnlock = getPendingUnlockNotice(completedCount, getSeenUnlocks());

  // 前回選んだ値は「並び順のヒント」としてだけ使う。選択済み状態にはしない。
  const savedContext = getContext();
  const placeOptions = reorderByLast(PLACE_OPTIONS, savedContext.lastPlaceContext);
  const scheduleOptions = reorderByLast(SCHEDULE_OPTIONS, savedContext.lastSchedulePressure);
  const socialOptions = reorderByLast(SOCIAL_OPTIONS, savedContext.lastSocialContext);

  useEffect(() => {
    if (pendingUnlock) markUnlockSeen(pendingUnlock.minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUnlock?.minutes]);

  function goBack() {
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  }

  function choosePlace(value: PlaceContext) {
    setPlaceContext(value);
    setStep(1);
  }

  function chooseSchedule(value: SchedulePressure) {
    setSchedulePressure(value);
    setStep(2);
  }

  function chooseSocial(value: SocialContext) {
    setSocialContext(value);
    setStep(3);
  }

  function chooseMood(value: Mood) {
    setMood(value);
    setStep(4);
  }

  function handleSubmit() {
    // 5項目（場所・予定・同席者・気分・時間）が明示的に揃っていない限りmissionSelectorを呼ばない。
    if (
      placeContext === null ||
      schedulePressure === null ||
      socialContext === null ||
      mood === null ||
      minutes === null
    ) {
      return;
    }
    const candidates = selectDailyCandidates({
      minutes,
      moods: [mood],
      placeContext,
      schedulePressure,
      socialContext,
    });
    if (candidates.length === 0) return;

    saveContext({
      lastPlaceContext: placeContext,
      lastSchedulePressure: schedulePressure,
      lastSocialContext: socialContext,
    });

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
      {step === 0 && (
        <div key="step-0" className="flex flex-1 flex-col animate-fade-in">
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
            <p className="text-[15px] leading-[1.8] text-ink">
              いま、どんなところに
              <br />
              いますか？
            </p>
            <ChipRow options={placeOptions} active={placeContext} onSelect={choosePlace} />
          </section>
        </div>
      )}

      {step === 1 && (
        <div key="step-1" className="flex flex-1 flex-col animate-fade-in">
          <BackLink onClick={goBack} />
          <div className="mt-10 flex flex-col items-center text-center">
            <Logo size="sm" muted />
            <p className="mt-10 font-serif-jp text-[22px] leading-[1.8] text-ink">
              このあと、
              <br />
              予定は？
            </p>
          </div>
          <ChipRow
            options={scheduleOptions}
            active={schedulePressure}
            onSelect={chooseSchedule}
            className="justify-center"
          />
        </div>
      )}

      {step === 2 && (
        <div key="step-2" className="flex flex-1 flex-col animate-fade-in">
          <BackLink onClick={goBack} />
          <div className="mt-10 flex flex-col items-center text-center">
            <Logo size="sm" muted />
            <p className="mt-10 font-serif-jp text-[22px] leading-[1.8] text-ink">今は？</p>
          </div>
          <ChipRow
            options={socialOptions}
            active={socialContext}
            onSelect={chooseSocial}
            className="justify-center"
          />
        </div>
      )}

      {step === 3 && (
        <div key="step-3" className="flex flex-1 flex-col animate-fade-in">
          <BackLink onClick={goBack} />
          <div className="mt-10 flex flex-col items-center text-center">
            <Logo size="sm" muted />
            <p className="mt-10 font-serif-jp text-[22px] leading-[1.8] text-ink">
              今、どんな気分ですか？
            </p>
          </div>
          <ChipRow
            options={moodOptions}
            active={mood}
            onSelect={chooseMood}
            className="justify-center"
          />
        </div>
      )}

      {step === 4 && (
        <div key="step-4" className="flex flex-1 flex-col animate-fade-in">
          <BackLink onClick={goBack} />
          <div className="mt-10 flex flex-col items-center text-center">
            <Logo size="sm" muted />
            <p className="mt-10 font-serif-jp text-[22px] leading-[1.8] text-ink">
              今日はどれくらい
              <br />
              時間がありますか？
            </p>
          </div>

          {pendingUnlock && (
            <p className="mt-8 text-center text-sm leading-[1.9] text-sage-deep animate-fade-in-slow">
              {pendingUnlock.message.main}
              <br />
              {pendingUnlock.message.sub}
            </p>
          )}

          <ChipRow
            options={timeOptions.map((m) => ({ value: String(m), label: `${m}分` }))}
            active={minutes !== null ? String(minutes) : null}
            onSelect={(v) => setMinutes(Number(v))}
            className="justify-center"
          />

          <div className="mt-auto pt-12">
            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
              今日の遠回りをもらう
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
