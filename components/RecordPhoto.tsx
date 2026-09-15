"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getJournalPhotoUrl, deleteJournalPhoto, updateJournalEntry } from "@/lib/journal";

/** 記録画面で、その日の写真をSupabase Storageから読み込んで表示する。 */
export function RecordPhoto({
  date,
  photoPath,
  onDeleted,
}: {
  date: string;
  photoPath: string;
  onDeleted: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getJournalPhotoUrl(supabase, photoPath)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch(() => {
        // 読み込みに失敗しても記録自体は表示を続ける
      });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  async function handleDelete() {
    const supabase = createClient();
    try {
      await deleteJournalPhoto(supabase, photoPath);
    } finally {
      await updateJournalEntry(supabase, date, { photoPath: null });
      onDeleted();
    }
  }

  if (!url) return null;

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="その日の遠回りの写真"
        className="h-32 w-32 rounded-xl object-cover"
      />
      <button
        type="button"
        onClick={handleDelete}
        className="touch-manipulation -mx-2 -my-2 px-2 py-2 text-[11px] text-ink-soft/60 underline underline-offset-4"
      >
        写真を削除
      </button>
    </div>
  );
}
