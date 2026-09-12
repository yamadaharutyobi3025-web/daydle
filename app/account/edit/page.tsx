import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AccountEditPage() {
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

  if (!profile) {
    // handle_new_user()トリガーが必ず作るはずだが、
    // 万一まだ存在しない場合はアカウント画面へ戻す。
    redirect("/account");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        プロフィールを編集
      </h1>

      <ProfileEditForm userId={user.id} initialProfile={profile} />
    </main>
  );
}
