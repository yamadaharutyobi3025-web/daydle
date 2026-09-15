"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { CurvedPath } from "@/components/CurvedPath";
import { RecordPhoto } from "@/components/RecordPhoto";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchJournalEntries, updateJournalEntry, type JournalEntry } from "@/lib/journal";
import { formatJapaneseDate, yesterdayKey } from "@/lib/date";
import { trackEvent } from "@/lib/track";
import type { Reflection } from "@/lib/storage";

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

type LoadState = "loading" | "not-signed-in" | "ready";

export default function RecordPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setLoadState("not-signed-in");
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoadState("not-signed-in");
        return;
      }
      const rows = await fetchJournalEntries(supabase);
      if (cancelled) return;
      setEntries(rows);
      setLoadState("ready");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const yKey = yesterdayKey();
  const pending = entries.find((e) => e.date === yKey && e.reflection === null);

  async function handleAnswer(reflection: Reflection) {
    const supabase = createClient();
    const { error } = await updateJournalEntry(supabase, yKey, { reflection });
    if (error) return;
    trackEvent("reflection_answered", { date: yKey, reflection });
    setEntries((prev) => prev.map((e) => (e.date === yKey ? { ...e, reflection } : e)));
  }

  function handlePhotoDeleted(entryDate: string) {
    setEntries((prev) =>
      prev.map((e) => (e.date === entryDate ? { ...e, photo_path: null } : e))
    );
  }

  if (loadState === "loading") return null;

  if (loadState === "not-signed-in") {
    return (
      <main className="mx-auto w-full max-w-sm px-6 pb-16 pt-10">
        <Logo size="sm" muted />
        <h1 className="mt-14 font-serif-jp text-[19px] text-ink">これまでの遠回り</h1>
        <p className="mt-6 text-sm leading-loose text-ink-soft">
          記録を見るにはログインが必要です。
        </p>
        <Link href="/login?next=%2Frecord" className="mt-6 inline-block">
          <Button>ログイン</Button>
        </Link>
      </main>
    );
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

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          まだ記録がありません。今日の遠回りから始めてみましょう。
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-6">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="relative rounded-2xl bg-paper/60 px-6 py-7 animate-fade-in"
            >
              <CurvedPath
                className={`absolute right-6 top-7 h-2.5 w-6 text-sage/35 ${
                  i % 2 === 1 ? "-scale-y-100" : ""
                }`}
              />
              <div className="flex items-center gap-3 pr-10">
                <span className="text-xs text-ink-soft">{formatJapaneseDate(entry.date)}</span>
                <span className="pointer-events-none text-line">・</span>
                <span className="text-[11px] text-sage-deep">できた</span>
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
                {entry.mission_text}
              </p>
              {entry.note && (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">― {entry.note}</p>
              )}
              {entry.photo_path && (
                <RecordPhoto
                  date={entry.date}
                  photoPath={entry.photo_path}
                  onDeleted={() => handlePhotoDeleted(entry.date)}
                />
              )}
              <Link
                href={`/share/${entry.date}`}
                className="relative z-10 mt-4 inline-block touch-manipulation -mx-2 -my-2 px-2 py-2 text-[11px] text-sage-deep underline underline-offset-4"
              >
                共有カードをつくる
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
