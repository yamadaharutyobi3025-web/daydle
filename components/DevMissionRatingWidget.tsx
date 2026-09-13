"use client";

import { useState } from "react";
import { addDevRating, type DevRating } from "@/lib/devRatings";
import { getTodayContext } from "@/lib/todayContext";
import type { Mission } from "@/types/mission";

const OPTIONS: { rating: DevRating; label: string }[] = [
  { rating: "great", label: "◎" },
  { rating: "good", label: "○" },
  { rating: "meh", label: "△" },
  { rating: "bad", label: "×" },
];

/**
 * 開発環境専用。「今日」画面に表示された遠回りへ、その場で人力評価
 * （◎/○/△/×）を付けるためのウィジェット。TodayScreen側で
 * process.env.NODE_ENV==="development"のときだけ描画される想定だが、
 * lib/devRatings.ts側にもガードがあるため、万一このコンポーネント単体が
 * 誤って本番でレンダーされても保存自体は行われない。
 */
export function DevMissionRatingWidget({ mission }: { mission: Mission }) {
  const [saved, setSaved] = useState<DevRating | null>(null);

  function handleRate(rating: DevRating) {
    const { situation, feeling } = getTodayContext();
    addDevRating({
      situation,
      feeling,
      missionId: mission.id,
      missionText: mission.description,
      rating,
    });
    setSaved(rating);
  }

  return (
    <div className="relative z-10 mt-8 rounded-2xl border border-dashed border-line/80 p-4">
      <p className="text-[11px] tracking-wide text-ink-soft/60">
        開発用：この遠回りへの評価
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.rating}
            type="button"
            onClick={() => handleRate(o.rating)}
            className={`touch-manipulation rounded-xl border py-2 text-center text-base transition-colors ${
              saved === o.rating
                ? "border-sage bg-sage-soft text-sage-deep"
                : "border-line/80 text-ink-soft hover:bg-cream-deep/50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {saved && (
        <p className="mt-2 text-center text-[11px] text-sage-deep">
          保存しました（この端末のみ）
        </p>
      )}
    </div>
  );
}
