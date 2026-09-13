import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { PostTriers } from "@/components/PostTriers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateKey, formatJapaneseDate } from "@/lib/date";
import type { AllowedTool } from "@/types/mission";

/**
 * 投稿の詳細画面。「みんな」「フォロー中」どちらの投稿カードからも
 * ここへ来る（PostCardが/post/[id]へリンクしている）。
 *
 * 可視性はpostsのRLS（posts_select_visible）に完全に委ねる。
 * ここで追加の権限チェックはしていない — selectが空ならnotFound()にする
 * ことで、「存在しない」のか「見る権限がない」のかを区別せず返す
 * （非公開投稿の存在自体を第三者に漏らさないため）。
 */
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, mission_text, duration_minutes, phone_mode, allowed_tools, comment, photo_path, created_at, profiles!inner(username, display_name, avatar_url)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    notFound();
  }

  let photoUrl: string | null = null;
  if (post.photo_path) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.storage
        .from("post-photos")
        .createSignedUrl(post.photo_path, 60);
      photoUrl = data?.signedUrl ?? null;
    } catch {
      photoUrl = null;
    }
  }

  const createdAt = new Date(post.created_at);
  const dateLabel = formatJapaneseDate(dateKey(createdAt));
  const timeLabel = createdAt.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />

      <Link href={`/u/${post.profiles.username}`} className="mt-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.profiles.avatar_url || "/icon-192"}
          alt=""
          className="h-11 w-11 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="text-sm">
          <p className="text-ink">{post.profiles.display_name || post.profiles.username}</p>
          <p className="text-xs text-ink-soft/70">
            @{post.profiles.username} ・ {dateLabel} {timeLabel}
          </p>
        </div>
      </Link>

      <p className="mt-8 font-serif-jp text-[20px] leading-[1.9] text-ink">{post.mission_text}</p>

      {post.comment && (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{post.comment}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
          {post.duration_minutes} MIN
        </span>
        <PhoneModeBadge
          phoneMode={post.phone_mode}
          allowedTools={post.allowed_tools as AllowedTool[]}
        />
      </div>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="mt-6 w-full rounded-2xl object-cover" />
      )}

      <PostTriers postId={post.id} />
    </main>
  );
}
