"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { CurvedPath } from "@/components/CurvedPath";
import { RecordPhoto } from "@/components/RecordPhoto";
import { findMissionById } from "@/lib/missionSelector";
import {
  getHistory,
  setReflection,
  type HistoryEntry,
  type Reflection,
} from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { formatJapaneseDate, yesterdayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";

const reflectionOptions: { value: Reflection; label: string }[] = [
  { value: "good", label: "よかった" },
  { value: "normal", label: "ふつう" },
  { value: "meh", label: "微妙だった" },
  { value: "skipped", label: "やらなかった" },
];

const reflectionLabel: Record<Reflection, string> = {
  good: "よかった",
  normal: "ふつう",
  meh: "微妙だった",
  skipped: "やらなかった",
};

export default function RecordPage() {
  const [tick, setTick] = useState(0);
  const history = useClientSnapshot<HistoryEntry[]>(() => {
    void tick;
    return getHistory();
  });

  if (history === UNLOADED) return null;

  const yKey = yesterdayKey();
  const pending = history.find(
    (h) =>
      h.date === yKey &&
      (h.status === "accepted" || h.status === "completed") &&
      h.reflection === null
  );

  function handleAnswer(reflection: Reflection) {
    setReflection(yKey, reflection);
    trackEvent("reflection_answered", { date: yKey, reflection });
    setTick((t) => t + 1);
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-16 pt-10">
      <Logo size="sm" muted />

      {pending && (
        <section className="mt-10 rounded-2xl bg-cream-deep/40 px-6 py-6 animate-fade-in">
          <p className="font-serif-jp text-[16px] leading-loose text-ink">
            昨日の遠回り、
            <br />
            どうでしたか？
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {reflectionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleAnswer(opt.value)}
                className="relative z-10 touch-manipulation rounded-full bg-paper px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-sage-soft hover:text-sage-deep"
              >
                <span className="absolute -inset-2" aria-hidden="true" />
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <h1 className="mt-14 font-serif-jp text-[19px] text-ink">これまでの遠回り</h1>

      {history.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          まだ記録がありません。今日の遠回りから始めてみましょう。
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-6">
          {history.map((entry, i) => {
            const mission = findMissionById(entry.missionId);
            return (
              <li
                key={entry.date}
                className="relative rounded-2xl bg-paper/60 px-6 py-7 animate-fade-in"
              >
                <CurvedPath
                  className={`absolute right-6 top-7 h-2.5 w-6 text-sage/35 ${
                    i % 2 === 1 ? "-scale-y-100" : ""
                  }`}
                />
                <div className="flex items-center gap-3 pr-10">
                  <span className="text-xs text-ink-soft">
                    {formatJapaneseDate(entry.date)}
                  </span>
                  {entry.status === "completed" && (
                    <>
                      <span className="pointer-events-none text-line">・</span>
                      <span className="text-[11px] text-sage-deep">できた</span>
                    </>
                  )}
                  {entry.reflection && (
                    <>
                      <span className="pointer-events-none text-line">・</span>
                      <span className="text-[11px] text-sage-deep">
                        {reflectionLabel[entry.reflection]}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-4 font-serif-jp text-[16px] leading-[1.95] text-ink">
                  {mission?.description ?? "（削除されたミッション）"}
                </p>
                {entry.note && (
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                    ― {entry.note}
                  </p>
                )}
                {entry.hasPhoto && (
                  <RecordPhoto date={entry.date} onDeleted={() => setTick((t) => t + 1)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
