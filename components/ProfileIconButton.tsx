"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { IconPerson } from "@/components/icons";

/**
 * 通常画面（今日/みんな/記録）の右上に置く、小さな丸いアカウント導線。
 * ログイン済み: /account へ、アバターがあれば表示。なければDAYDLEの
 * 既存アイコン(/icon)を表示。
 * 未ログイン（またはSupabase未設定）: /login へ、人型アイコンを表示。
 * Social機能を使わない場合に何かが壊れることはない（単なるリンク）。
 */
export function ProfileIconButton() {
  const [href, setHref] = useState("/login");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    let cancelled = false;

    async function applyUser(userId: string | null) {
      if (!userId) {
        if (!cancelled) {
          setHref("/login");
          setAvatarUrl(null);
        }
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) {
        setHref("/account");
        setAvatarUrl(profile?.avatar_url ?? null);
      }
    }

    supabase.auth.getUser().then(({ data }) => applyUser(data.user?.id ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label="アカウント"
      className="fixed right-4 z-20 flex h-9 w-9 touch-manipulation items-center justify-center overflow-hidden rounded-full bg-cream-deep/70 text-ink-soft/80 shadow-sm transition-colors hover:bg-cream-deep"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : href === "/account" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icon" alt="" className="h-full w-full object-cover" />
      ) : (
        <IconPerson className="h-4 w-4" />
      )}
    </Link>
  );
}
