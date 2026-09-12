"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import {
  getTodayMission,
  setJournalEntry,
  NOTE_MAX_LENGTH,
  type TodayMissionState,
} from "@/lib/storage";
import { useClientSnapshot, UNLOADED } from "@/lib/useClientSnapshot";
import { compressImage } from "@/lib/imageCompress";
import { savePhoto } from "@/lib/photoStore";

export default function JournalPage() {
  const router = useRouter();
  const today = useClientSnapshot<TodayMissionState | null>(() => getTodayMission());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (today === null) {
      router.replace("/");
    }
  }, [today, router]);

  if (today === UNLOADED || !today) return null;

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const compressed = await compressImage(file);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(compressed);
      });
      setPhotoBlob(compressed);
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoBlob(null);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  async function handleSave() {
    if (isSaving || !today || today === UNLOADED) return;
    setIsSaving(true);
    try {
      if (photoBlob) {
        await savePhoto(today.date, photoBlob);
      }
      setJournalEntry(today.date, {
        note: note.trim() ? note.trim() : null,
        hasPhoto: Boolean(photoBlob),
      });
    } catch {
      // 保存に失敗しても、この記録自体は必須ではないため先へ進む
    } finally {
      router.push("/complete");
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-10">
      <div className="animate-fade-in flex flex-col items-center text-center">
        <Logo size="sm" muted />
        <p className="mt-10 font-serif-jp text-[20px] leading-[1.9] text-ink">
          今日の遠回りを、
          <br />
          少しだけ残しますか？
        </p>
        <p className="mt-3 text-[13px] leading-loose text-ink-soft">
          写真もひとことも、なくても大丈夫です。
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 animate-fade-in-slow">
        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="今日の遠回りの写真"
              className="h-48 w-48 rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="touch-manipulation -mx-3 -my-2 px-3 py-2 text-xs text-ink-soft/70 underline underline-offset-4"
            >
              写真を削除
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPhoto}
            className="w-full"
          >
            {isProcessingPhoto ? "処理中…" : "写真を残す"}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickPhoto}
          className="hidden"
        />
        <p className="text-center text-[11px] leading-relaxed text-ink-soft/60">
          写真はこの端末にだけ保存されます。
        </p>
      </div>

      <div className="mt-8 animate-fade-in-slow">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          placeholder="夕方の光が思ったよりきれいだった。"
          className="w-full resize-none rounded-2xl bg-cream-deep/40 px-5 py-4 text-sm leading-relaxed text-ink placeholder:text-ink-soft/50 focus:outline-none"
        />
        <p className="mt-1 text-right text-[11px] text-ink-soft/50">
          {note.length} / {NOTE_MAX_LENGTH}
        </p>
      </div>

      <div className="mt-auto pt-10">
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          残す
        </Button>
      </div>
    </main>
  );
}
