import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { UserListItem } from "@/components/UserListItem";
import { FollowRequestActions } from "@/components/FollowRequestActions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function FollowRequestsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: pending } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("followee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const followerIds = (pending ?? []).map((p) => p.follower_id);
  const { data: profiles } = followerIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", followerIds)
    : { data: [] };

  const requests = (pending ?? [])
    .map((p) => ({
      followerId: p.follower_id,
      profile: profiles?.find((prof) => prof.id === p.follower_id) ?? null,
    }))
    .filter((r) => r.profile !== null);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />
      <h1 className="mt-8 font-serif-jp text-[20px] text-ink">フォロー申請</h1>

      {requests.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">申請はありません。</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-5">
          {requests.map((r) => (
            <li key={r.followerId} className="flex items-center justify-between gap-3">
              <UserListItem user={r.profile!} />
              <FollowRequestActions followerId={r.followerId} followeeId={user.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
