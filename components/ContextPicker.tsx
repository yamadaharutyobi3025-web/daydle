"use client";

import { useState } from "react";
import type { PlaceContext, SchedulePressure, SocialContext } from "@/types/context";

const PLACE_LABELS: Record<PlaceContext, string> = {
  home: "家にいる",
  work_school: "職場・学校にいる",
  outside: "外にいる",
  transit: "移動中",
};

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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
        active ? "bg-sage-soft text-sage-deep" : "bg-cream-deep/50 text-ink-soft"
      }`}
    >
      <span className="absolute -inset-1.5" aria-hidden="true" />
      {children}
    </button>
  );
}

export function ContextPicker({
  placeContext,
  schedulePressure,
  socialContext,
  onChangePlace,
  onChangeSchedule,
  onChangeSocial,
}: {
  /** null＝ユーザーがまだ一度もこの項目を選んでいない（未設定）。 */
  placeContext: PlaceContext | null;
  schedulePressure: SchedulePressure | null;
  socialContext: SocialContext | null;
  onChangePlace: (value: PlaceContext) => void;
  onChangeSchedule: (value: SchedulePressure) => void;
  onChangeSocial: (value: SocialContext) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSet = placeContext !== null || schedulePressure !== null || socialContext !== null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-soft">
          いまの状況{"　"}
          <span className="text-ink">
            {placeContext ? PLACE_LABELS[placeContext] : "未設定"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="relative z-10 touch-manipulation text-xs text-ink-soft/70 underline underline-offset-4"
        >
          <span className="absolute -inset-3" aria-hidden="true" />
          {expanded ? "閉じる" : isSet ? "変更" : "設定する"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {PLACE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={placeContext === opt.value}
                onClick={() => onChangePlace(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>

          <div>
            <p className="text-[12px] text-ink-soft/70">このあと予定は？</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCHEDULE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={schedulePressure === opt.value}
                  onClick={() => onChangeSchedule(opt.value)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] text-ink-soft/70">今は？</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOCIAL_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={socialContext === opt.value}
                  onClick={() => onChangeSocial(opt.value)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
