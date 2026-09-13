"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { findMissionById } from "@/lib/missionSelector";
import { getHistory, getDetourNumber } from "@/lib/storage";
import { getPhoto } from "@/lib/photoStore";
import { generateShareCard } from "@/lib/shareCard";
import { getPhoneModeLabel } from "@/components/PhoneModeBadge";
import { useClientSnapshot } from "@/lib/useClientSnapshot";

type Status = "loading" | "ready" | "not-found" | "error";

function detectCanShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return false;
  }
  const dummy = new File([new Uint8Array([0])], "test.jpg", { type: "image/jpeg" });
  return navigator.canShare({ files: [dummy] });
}

export default function ShareCardPage() {
  const params = useParams<{ date: string }>();
  const date = params.date;

  const [status, setStatus] = useState<Status>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const canShareFiles = useClientSnapshot<boolean>(detectCanShareFiles);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const entry = getHistory().find((h) => h.date === date);
      if (!entry) {
        if (!cancelled) setStatus("not-found");
        return;
      }
      const mission = findMissionById(entry.missionId);
      if (!mission) {
        if (!cancelled) setStatus("not-found");
        return;
      }
      try {
        let photoBlob: Blob | null = null;
        if (entry.hasPhoto) {
          try {
            photoBlob = await getPhoto(date);
          } catch (err) {
            console.error("Failed to load photo for share card:", err);
          }
        }
        const blob = await generateShareCard({
          missionDescription: mission.description,
          photoBlob,
          note: entry.note ?? null,
          durationMinutes: mission.duration,
          durationDisplayTier: mission.displayDuration,
          phoneModeLabel: getPhoneModeLabel(mission.phoneMode, mission.allowedTools),
          dateKey: date,
          detourNumber: getDetourNumber(date),
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setImageBlob(blob);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [date]);

  async function handleShare() {
    if (!imageBlob) return;
    const file = new File([imageBlob], "daydle-card.jpg", { type: "image/jpeg" });
    try {
      await navigator.share({ files: [file], title: "DAYDLE" });
    } catch {
      // ユーザーによるキャンセルなど。何もしない
    }
  }

  function handleSave() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "daydle-card.jpg";
    a.click();
  }

  if (status === "not-found") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">この日の記録が見つかりませんでした。</p>
        <Link
          href="/record"
          className="touch-manipulation -mx-3 -my-3 px-3 py-3 text-sm underline underline-offset-4 text-ink-soft"
        >
          記録へ戻る
        </Link>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm text-ink-soft">
          カードを作成できませんでした。もう一度お試しください。
        </p>
        <Link
          href="/record"
          className="touch-manipulation -mx-3 -my-3 px-3 py-3 text-sm underline underline-offset-4 text-ink-soft"
        >
          記録へ戻る
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col items-center px-6 pb-10 pt-10 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <Logo size="sm" muted />
        <p className="mt-6 text-[13px] leading-loose text-ink-soft">
          {status === "loading" ? "カードをつくっています…" : "共有カードができました。"}
        </p>
      </div>

      <div className="mt-8 w-full max-w-[280px] animate-fade-in-slow">
        <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-cream-deep/40">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="DAYDLE CARD" className="h-full w-full object-cover" />
          )}
        </div>
      </div>

      {status === "ready" && (
        <div className="mt-10 flex w-full flex-col gap-3 animate-fade-in-slow">
          {canShareFiles === true && (
            <Button onClick={handleShare} className="w-full">
              共有する
            </Button>
          )}
          <Button
            variant={canShareFiles === true ? "ghost" : "primary"}
            onClick={handleSave}
            className="w-full"
          >
            画像を保存する
          </Button>
        </div>
      )}

      <Link
        href="/record"
        className="relative z-10 mt-8 touch-manipulation text-xs text-ink-soft/60"
      >
        <span className="absolute -inset-3" aria-hidden="true" />
        記録に戻る
      </Link>
    </main>
  );
}
