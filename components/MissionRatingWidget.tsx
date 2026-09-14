"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getOwnerUserId,
  saveMissionRating,
  MISSION_RATING_SYMBOL,
  type MissionRating,
} from "@/lib/missionRatings";
import { getTodayContext } from "@/lib/todayContext";
import { todayKey } from "@/lib/date";
import type { Mission } from "@/types/mission";

const OPTIONS: MissionRating[] = ["great", "good", "meh", "bad"];

/**
 * 「今日」画面に表示された遠回りへ、その場で実使用評価（◎/○/△/×）を
 * 付けるためのウィジェット。DAYDLE本人（NEXT_PUBLIC_OWNER_USER_ID）で
 * ログインしているときだけ表示する。一般ユーザーには表示されず、万一
 * 表示条件をすり抜けても、保存自体はSupabase側のRLSで本人以外は
 * 拒否される（supabase/migrations/0011_mission_ratings.sql）。
 */
export function MissionRatingWidget({ mission }: { mission: Mission }) {
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState<MissionRating | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const targetOwnerId = getOwnerUserId();
    if (!targetOwnerId) return;

    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user?.id === targetOwnerId) {
        setOwnerUserId(data.user.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRate(rating: MissionRating) {
    if (!ownerUserId) return;
    setSaving(true);
    setError(null);
    const { situation, feeling } = getTodayContext();
    const supabase = createClient();
    const { error: saveError } = await saveMissionRating(supabase, {
      userId: ownerUserId,
      date: todayKey(),
      situation,
      feeling,
      missionId: mission.id,
      missionText: mission.description,
      rating,
    });
    setSaving(false);
    if (saveError) {
      setError("保存に失敗しました");
      return;
    }
    setSaved(rating);
  }

  if (!ownerUserId) return null;

  return (
    <div className="relative z-10 mt-8 rounded-2xl border border-dashed border-line/80 p-4">
      <p className="text-[11px] tracking-wide text-ink-soft/60">この遠回りへの評価</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {OPTIONS.map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={saving}
            onClick={() => handleRate(rating)}
            className={`touch-manipulation rounded-xl border py-2 text-center text-base transition-colors disabled:opacity-50 ${
              saved === rating
                ? "border-sage bg-sage-soft text-sage-deep"
                : "border-line/80 text-ink-soft hover:bg-cream-deep/50"
            }`}
          >
            {MISSION_RATING_SYMBOL[rating]}
          </button>
        ))}
      </div>
      {saved && <p className="mt-2 text-center text-[11px] text-sage-deep">保存しました</p>}
      {error && <p className="mt-2 text-center text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
