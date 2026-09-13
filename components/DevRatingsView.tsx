"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearDevRatings,
  getDevRatings,
  DEV_RATING_LABEL,
  DEV_RATING_SYMBOL,
  type DevRating,
  type DevRatingEntry,
} from "@/lib/devRatings";
import type { Situation, Feeling } from "@/types/context";
import { Button } from "@/components/Button";

const SITUATION_LABEL: Record<Situation, string> = {
  home: "家にいる",
  outside: "外にいる",
  transit: "移動中",
  work_school: "仕事・学校の合間",
  unsure: "特に決まっていない",
};

const FEELING_LABEL: Record<Feeling, string> = {
  tired: "少し疲れている",
  bored: "退屈している",
  calm_seeking: "落ち着きたい",
  want_to_do_something: "何かしたい",
  good_mood: "気分がいい",
  neutral: "なんとなく",
};

const POSITIVE: DevRating[] = ["great", "good"];

function isPositive(r: DevRating): boolean {
  return POSITIVE.includes(r);
}

interface GroupRow {
  key: string;
  label: string;
  count: number;
  positiveRate: number;
}

function groupBy<T extends string>(
  entries: DevRatingEntry[],
  keyOf: (e: DevRatingEntry) => T,
  labelOf: (key: T) => string
): GroupRow[] {
  const map = new Map<string, DevRatingEntry[]>();
  for (const e of entries) {
    const key = keyOf(e);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries())
    .map(([key, list]) => ({
      key,
      label: labelOf(key as T),
      count: list.length,
      positiveRate: (list.filter((e) => isPositive(e.rating)).length / list.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function DevRatingsView() {
  const [entries, setEntries] = useState<DevRatingEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (!cancelled) setEntries(getDevRatings());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    const total = entries.length;
    const positiveCount = entries.filter((e) => isPositive(e.rating)).length;
    const negativeCount = total - positiveCount;
    return {
      total,
      positiveRate: (positiveCount / total) * 100,
      negativeRate: (negativeCount / total) * 100,
      bySituation: groupBy(
        entries,
        (e) => (e.situation ?? "unknown") as Situation | "unknown",
        (key) => (key === "unknown" ? "不明（私もやってみる 等）" : SITUATION_LABEL[key as Situation])
      ),
      byFeeling: groupBy(
        entries,
        (e) => (e.feeling ?? "unknown") as Feeling | "unknown",
        (key) => (key === "unknown" ? "不明（私もやってみる 等）" : FEELING_LABEL[key as Feeling])
      ),
      byMission: groupBy(
        entries,
        (e) => e.missionId,
        (key) => key
      ),
    };
  }, [entries]);

  function handleClear() {
    if (!window.confirm("保存済みの評価をすべて削除します。よろしいですか？")) return;
    clearDevRatings();
    setEntries([]);
  }

  if (entries === null) {
    return <p className="mt-10 text-sm text-ink-soft/70">読み込み中…</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="mt-10 text-sm text-ink-soft/70">
        まだ評価がありません。「今日」画面で◎/○/△/×を付けると、ここに集計されます。
      </p>
    );
  }

  return (
    <div className="mt-10">
      <section>
        <h2 className="font-serif-jp text-[17px] text-ink">集計</h2>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-cream-deep/40 p-4">
            <dt className="text-[11px] text-ink-soft/70">評価件数</dt>
            <dd className="mt-1 text-xl text-ink">{stats!.total}</dd>
          </div>
          <div className="rounded-2xl bg-sage-soft/60 p-4">
            <dt className="text-[11px] text-sage-deep/80">◎○率</dt>
            <dd className="mt-1 text-xl text-sage-deep">{formatPercent(stats!.positiveRate)}</dd>
          </div>
          <div className="rounded-2xl bg-cream-deep/40 p-4">
            <dt className="text-[11px] text-ink-soft/70">△×率</dt>
            <dd className="mt-1 text-xl text-ink">{formatPercent(stats!.negativeRate)}</dd>
          </div>
        </dl>
      </section>

      <BreakdownTable title="状況別" rows={stats!.bySituation} />
      <BreakdownTable title="気分別" rows={stats!.byFeeling} />
      <BreakdownTable title="ミッション別" rows={stats!.byMission} mono />

      <section className="mt-12">
        <h2 className="font-serif-jp text-[17px] text-ink">評価ログ（新しい順）</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {entries.map((e, i) => (
            <li key={i} className="rounded-2xl border border-line/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-soft/60">{formatDateTime(e.ratedAt)}</span>
                <span className="text-sm text-sage-deep">
                  {DEV_RATING_SYMBOL[e.rating]} {DEV_RATING_LABEL[e.rating].replace(/^[◎○△×]\s*/, "")}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink">{e.missionText}</p>
              <p className="mt-1 text-xs text-ink-soft/60">
                {e.missionId} ・{" "}
                {e.situation ? SITUATION_LABEL[e.situation] : "状況不明"} ×{" "}
                {e.feeling ? FEELING_LABEL[e.feeling] : "気分不明"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Button variant="text" className="mt-10" onClick={handleClear}>
        評価をすべて削除する
      </Button>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  mono = false,
}: {
  title: string;
  rows: GroupRow[];
  mono?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-serif-jp text-[17px] text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-1.5">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between rounded-xl bg-cream-deep/30 px-4 py-2.5 text-sm"
          >
            <span className={mono ? "font-mono text-xs text-ink" : "text-ink"}>{r.label}</span>
            <span className="text-ink-soft">
              {r.count}件 ・ ◎○{formatPercent(r.positiveRate)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
