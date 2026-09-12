import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
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
    .select("username, is_private")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        アカウント
      </h1>

      <div className="mt-10 flex flex-col gap-2 text-sm text-ink-soft">
        <p>{user.email}</p>
        {profile && (
          <p>
            @{profile.username}（{profile.is_private ? "非公開" : "公開"}）
          </p>
        )}
      </div>

      <p className="mt-6 text-xs leading-loose text-ink-soft/70">
        プロフィール編集・投稿・フォローはこの後の段階で追加予定です。
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
