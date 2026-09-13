"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getHistory } from "@/lib/storage";
import { findMissionById } from "@/lib/missionSelector";
import { getPhoto } from "@/lib/photoStore";
import { todayKey } from "@/lib/date";
import { formatDurationLabel } from "@/lib/durationDisplay";
import type { Mission } from "@/types/mission";

/** 投稿専用の「ひとこと」の文字数上限。ジャーナルのNOTE_MAX_LENGTHとは別物。 */
const COMMENT_MAX_LENGTH = 80;

type Status =
  | "loading"
  | "need-login"
  | "no-entry"
  | "already-posted"
  | "ready"
  | "posting"
  | "posted"
  | "error";

/**
 * 完了記録（history）とは別の、明示的な「投稿する」操作。
 * ここで投稿されるのは投稿時点の表示内容のスナップショットだけで、
 * Context Engineの回答内容・位置情報・気分・予定・同席者は一切含めない。
 */
export default function NewPostPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [comment, setComment] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured()) {
        setStatus("need-login");
        return;
      }

      const entry = getHistory().find(
        (h) => h.date === todayKey() && h.status === "completed"
      );
      if (!entry) {
        setStatus("no-entry");
        return;
      }
      const m = findMissionById(entry.missionId);
      if (!m) {
        setStatus("no-entry");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("need-login");
        return;
      }

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", dayStart.toISOString());
      if (count && count > 0) {
        setStatus("already-posted");
        return;
      }

      if (entry.hasPhoto) {
        const blob = await getPhoto(entry.date);
        if (blob) {
          setPhotoBlob(blob);
          setPhotoPreviewUrl(URL.createObjectURL(blob));
        }
      }

      setUserId(user.id);
      setMission(m);
      setStatus("ready");
    }

    void init();
  }, []);

  async function handlePost() {
    if (!mission || !userId) return;
    setStatus("posting");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const id = crypto.randomUUID();
      let photoPath: string | null = null;

      if (photoBlob) {
        photoPath = `${userId}/${id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("post-photos")
          .upload(photoPath, photoBlob, { contentType: "image/jpeg" });
        if (uploadError) {
          console.error("post photo upload failed", uploadError);
          setErrorMessage(`写真のアップロードに失敗しました: ${uploadError.message}`);
          setStatus("ready");
          return;
        }
      }

      const { error: insertError } = await supabase.from("posts").insert({
        id,
        user_id: userId,
        mission_text: mission.description,
        duration_minutes: mission.duration,
        phone_mode: mission.phoneMode,
        allowed_tools: mission.allowedTools,
        comment: comment.trim() || null,
        photo_path: photoPath,
      });
      if (insertError) {
        console.error("post insert failed", insertError);
        setErrorMessage(insertError.message);
        setStatus("ready");
        return;
      }

      setStatus("posted");
    } catch (err) {
      console.error("post failed", err);
      setErrorMessage(err instanceof Error ? err.message : "投稿に失敗しました。");
      setStatus("ready");
    }
  }

  if (status === "loading") return null;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">投稿する</h1>

      {status === "need-login" && (
        <div className="mt-10 flex flex-col gap-4">
          <p className="text-sm leading-loose text-ink-soft">
            投稿にはログインが必要です。
          </p>
          <Link href="/login">
            <Button>ログイン</Button>
          </Link>
        </div>
      )}

      {status === "no-entry" && (
        <div className="mt-10 flex flex-col gap-4">
          <p className="text-sm leading-loose text-ink-soft">
            今日、投稿できる遠回りがありません。
          </p>
          <Link href="/" className="text-xs text-ink-soft/60 underline underline-offset-4">
            アプリに戻る
          </Link>
        </div>
      )}

      {status === "already-posted" && (
        <div className="mt-10 flex flex-col gap-4">
          <p className="text-sm leading-loose text-ink-soft">
            今日はもう投稿済みです。
          </p>
          <Link href="/community">
            <Button variant="ghost">みんなの投稿を見る</Button>
          </Link>
        </div>
      )}

      {(status === "ready" || status === "posting") && mission && (
        <div className="mt-10 flex flex-col gap-6">
          <div className="rounded-2xl bg-cream-deep/30 p-5">
            <p className="font-serif-jp text-[17px] leading-[1.8] text-ink">
              {mission.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
                {formatDurationLabel(mission.duration, mission.displayDuration)}
              </span>
              <PhoneModeBadge phoneMode={mission.phoneMode} allowedTools={mission.allowedTools} />
            </div>
            {photoPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreviewUrl}
                alt=""
                className="mt-3 h-48 w-full rounded-2xl object-cover"
              />
            )}
          </div>

          <div>
            <label className="text-[13px] text-ink-soft">やってみて、どうだった？</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
              maxLength={COMMENT_MAX_LENGTH}
              rows={2}
              placeholder="思ったより風の音が聞こえた。"
              className="mt-1.5 w-full resize-none rounded-2xl bg-cream-deep/40 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-soft/50 focus:outline-none"
            />
            <p className="mt-1 text-right text-[11px] text-ink-soft/50">
              {comment.length} / {COMMENT_MAX_LENGTH}
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-soft/60">
            表示名・プロフィール画像・この内容だけが投稿されます。
            いま選んだ場所・予定・気分などは投稿されません。
          </p>

          {errorMessage && <p className="text-xs text-red-700/80">{errorMessage}</p>}

          <Button onClick={handlePost} disabled={status === "posting"} className="w-full">
            {status === "posting" ? "投稿中…" : "投稿する"}
          </Button>
        </div>
      )}

      {status === "posted" && (
        <div className="mt-10 flex flex-col gap-4">
          <p className="text-sm leading-loose text-sage-deep">投稿しました。</p>
          <Link href="/community">
            <Button>みんなの投稿を見る</Button>
          </Link>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-center text-xs text-ink-soft/60 underline underline-offset-4"
          >
            アプリに戻る
          </button>
        </div>
      )}
    </main>
  );
}
