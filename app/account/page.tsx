import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { LogoutButton } from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AccountPage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, is_private")
    .eq("id", user.id)
    .single();

  const [{ data: counts }, { count: pendingRequestCount }, { count: unreadNotificationCount }] =
    await Promise.all([
      supabase.rpc("get_follow_counts", { target: user.id }),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
  const followersCount = counts?.[0]?.followers_count ?? 0;
  const followingCount = counts?.[0]?.following_count ?? 0;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        アカウント
      </h1>

      <div className="mt-10 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile?.avatar_url || "/icon-192"}
          alt=""
          className="h-16 w-16 rounded-full object-cover bg-cream-deep/60"
        />
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="text-ink">{profile?.display_name || "（表示名未設定）"}</p>
          <p className="text-ink-soft">
            @{profile?.username}（{profile?.is_private ? "非公開" : "公開"}）
          </p>
        </div>
      </div>

      {profile?.bio && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {profile.bio}
        </p>
      )}

      <p className="mt-4 text-xs text-ink-soft/70">{user.email}</p>

      {profile && (
        <div className="mt-6 flex gap-6 text-sm">
          <Link href={`/u/${profile.username}/following`} className="text-ink-soft">
            フォロー中 <span className="text-ink">{followingCount}</span>
          </Link>
          <Link href={`/u/${profile.username}/followers`} className="text-ink-soft">
            フォロワー <span className="text-ink">{followersCount}</span>
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link href="/notifications">
          <Button variant="ghost" className="w-full">
            通知{unreadNotificationCount ? ` ${unreadNotificationCount}` : ""}
          </Button>
        </Link>
        <Link href="/account/edit">
          <Button variant="ghost" className="w-full">
            プロフィールを編集
          </Button>
        </Link>
        <Link href="/account/requests">
          <Button variant="ghost" className="w-full">
            フォロー申請{pendingRequestCount ? `（${pendingRequestCount}）` : ""}
          </Button>
        </Link>
        <Link href="/search">
          <Button variant="ghost" className="w-full">
            ユーザーを探す
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-xs leading-loose text-ink-soft/70">
        投稿はこの後の段階で追加予定です。
      </p>

      <div className="mt-auto flex flex-col gap-3 pt-12">
        <LogoutButton />
        <Link href="/" className="text-center text-xs text-ink-soft/60 underline underline-offset-4">
          アプリに戻る
        </Link>
      </div>
    </main>
  );
}
