import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { FollowButton } from "@/components/FollowButton";
import { ProfilePosts } from "@/components/ProfilePosts";
import { createClient } from "@/lib/supabase/server";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, is_private")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const [{ data: counts }, relation, { data: canViewPosts }] = await Promise.all([
    supabase.rpc("get_follow_counts", { target: profile.id }),
    viewer
      ? supabase
          .from("follows")
          .select("status")
          .eq("follower_id", viewer.id)
          .eq("followee_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // 投稿一覧を見せてよいかは、フォロー中/フォロワー一覧と全く同じ基準
    // （対象が公開 or 本人 or 対象への承認済みフォロー）なので、その判定用
    // に既に用意されているSECURITY DEFINER関数をそのまま再利用する。
    supabase.rpc("can_view_follow_lists", { target: profile.id }),
  ]);

  const followersCount = counts?.[0]?.followers_count ?? 0;
  const followingCount = counts?.[0]?.following_count ?? 0;
  const initialStatus = relation?.data?.status ?? "none";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />

      <div className="mt-10 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url || "/icon-192"}
          alt=""
          className="h-16 w-16 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="text-ink">{profile.display_name || profile.username}</p>
          <p className="text-ink-soft">
            @{profile.username}（{profile.is_private ? "非公開" : "公開"}）
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {profile.bio}
        </p>
      )}

      <div className="mt-6 flex gap-6 text-sm">
        <Link href={`/u/${profile.username}/following`} className="text-ink-soft">
          フォロー中 <span className="text-ink">{followingCount}</span>
        </Link>
        <Link href={`/u/${profile.username}/followers`} className="text-ink-soft">
          フォロワー <span className="text-ink">{followersCount}</span>
        </Link>
      </div>

      <div className="mt-6">
        <FollowButton
          viewerId={viewer?.id ?? null}
          targetId={profile.id}
          targetIsPrivate={profile.is_private}
          initialStatus={initialStatus}
        />
      </div>

      {canViewPosts && (
        <section className="mt-14 border-t border-line/60 pt-10">
          <h2 className="text-[13px] text-ink-soft">この人の遠回り</h2>
          <div className="mt-5">
            <ProfilePosts userId={profile.id} />
          </div>
        </section>
      )}
    </main>
  );
}
