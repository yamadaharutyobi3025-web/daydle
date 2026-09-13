import Link from "next/link";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { PostPhoto } from "@/components/PostPhoto";
import { TryThisButton } from "@/components/TryThisButton";
import { PostTriers } from "@/components/PostTriers";
import { dateKey, formatJapaneseDate } from "@/lib/date";
import type { PostWithProfile } from "@/types/supabase";
import type { AllowedTool } from "@/types/mission";

/**
 * カード全体のクリック領域は「stretched link」パターンで作る
 * （li側にonClickを持たせてJSのバブリングに頼る方式は、間に何か挟まると
 * 壊れやすいので採用しない）。
 *
 * 実装: カード本体を覆う透明な<Link>（/post/[id]へ、absolute inset-0）を
 * 一番下に敷き、プロフィール部分（/u/[username]へ行く別の<Link>）だけを
 * position:relative + z-indexで上に重ねる。本文・バッジ・ひとこと・写真は
 * 何も指定しないことで自動的に一番下のstretched linkの下敷きになり
 * （＝クリックはそのままstretched linkへ通り抜けて/post/[id]へ行く）、
 * 見た目はそのまま透けて見える（stretched link自体は不可視のため）。
 *
 * 2つの<Link>はDOM上は兄弟であり、<a>の中に<a>を入れているわけではない
 * ので、無効なHTMLにはならない。プロフィール部分だけが上に重なっている
 * ことで、そこだけ別の遷移先になる。
 */
export function PostCard({ post }: { post: PostWithProfile }) {
  const createdAt = new Date(post.created_at);
  const dateLabel = formatJapaneseDate(dateKey(createdAt));
  const timeLabel = createdAt.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const displayName = post.profiles.display_name || post.profiles.username;

  return (
    <li className="relative rounded-2xl bg-cream-deep/30 p-5">
      <Link
        href={`/post/${post.id}`}
        aria-label={`${displayName}さんの投稿: ${post.mission_text}`}
        className="absolute inset-0 z-0 rounded-2xl"
      />

      <Link
        href={`/u/${post.profiles.username}`}
        className="relative z-10 flex w-fit items-center gap-3 touch-manipulation"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.profiles.avatar_url || "/icon-192"}
          alt=""
          className="h-9 w-9 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="text-sm">
          <p className="text-ink">{displayName}</p>
          <p className="text-xs text-ink-soft/70">
            @{post.profiles.username} ・ {dateLabel} {timeLabel}
          </p>
        </div>
      </Link>

      <p className="pointer-events-none mt-4 font-serif-jp text-[17px] leading-[1.8] text-ink">
        {post.mission_text}
      </p>

      {post.comment && (
        <p className="pointer-events-none mt-2 text-sm leading-relaxed text-ink-soft">
          {post.comment}
        </p>
      )}

      <div className="pointer-events-none mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
          {post.duration_minutes} MIN
        </span>
        <PhoneModeBadge
          phoneMode={post.phone_mode}
          allowedTools={post.allowed_tools as AllowedTool[]}
        />
      </div>

      {post.photo_path && (
        <div className="pointer-events-none">
          <PostPhoto postId={post.id} />
        </div>
      )}

      <TryThisButton
        post={{
          id: post.id,
          mission_text: post.mission_text,
          duration_minutes: post.duration_minutes,
          phone_mode: post.phone_mode,
          allowed_tools: post.allowed_tools,
        }}
      />

      <PostTriers postId={post.id} />
    </li>
  );
}
