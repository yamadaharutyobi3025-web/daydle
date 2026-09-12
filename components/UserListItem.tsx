import Link from "next/link";
import type { FollowListItem } from "@/types/supabase";

export function UserListItem({ user }: { user: FollowListItem }) {
  return (
    <Link href={`/u/${user.username}`} className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.avatar_url || "/icon-192"}
        alt=""
        className="h-10 w-10 rounded-full object-cover bg-cream-deep/60"
      />
      <div className="text-sm">
        <p className="text-ink">{user.display_name || user.username}</p>
        <p className="text-ink-soft">@{user.username}</p>
      </div>
    </Link>
  );
}
