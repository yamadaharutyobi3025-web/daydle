import Link from "next/link";
import { PhoneModeBadge } from "@/components/PhoneModeBadge";
import { PostPhoto } from "@/components/PostPhoto";
import { dateKey, formatJapaneseDate } from "@/lib/date";
import type { PostWithProfile } from "@/types/supabase";
import type { AllowedTool } from "@/types/mission";

export function PostCard({ post }: { post: PostWithProfile }) {
  const dateLabel = formatJapaneseDate(dateKey(new Date(post.created_at)));

  return (
    <li className="rounded-2xl bg-cream-deep/30 p-5">
      <Link href={`/u/${post.profiles.username}`} className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.profiles.avatar_url || "/icon-192"}
          alt=""
          className="h-9 w-9 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="text-sm">
          <p className="text-ink">{post.profiles.display_name || post.profiles.username}</p>
          <p className="text-xs text-ink-soft/70">
            @{post.profiles.username} ・ {dateLabel}
          </p>
        </div>
      </Link>

      <p className="mt-4 font-serif-jp text-[17px] leading-[1.8] text-ink">
        {post.mission_text}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cream-deep/70 px-3 py-1 text-[11px] tracking-wide text-ink-soft">
          {post.duration_minutes} MIN
        </span>
        <PhoneModeBadge
          phoneMode={post.phone_mode}
          allowedTools={post.allowed_tools as AllowedTool[]}
        />
      </div>

      {post.note && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{post.note}</p>}

      {post.photo_path && <PostPhoto postId={post.id} />}
    </li>
  );
}
