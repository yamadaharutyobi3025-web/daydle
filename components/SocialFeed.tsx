"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { PostCard } from "@/components/PostCard";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PostWithProfile } from "@/types/supabase";

type Tab = "following" | "everyone";

const POST_COLUMNS =
  "id, user_id, mission_text, duration_minutes, phone_mode, allowed_tools, note, photo_path, created_at";

/**
 * 「みんな」画面の下に追加する、Supabaseの投稿フィード。
 * 既存の静的な「みんなの遠回り例」セクションはそのまま残し、
 * このセクションはその下に独立して追加する。
 */
export function SocialFeed() {
  // 確認が終わるまでは「未ログイン」表示にしておき、ログイン済みと
  // 分かった時点でだけ更新する（未確認の間だけ出る中間状態を作らない）。
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("following");
  const [posts, setPosts] = useState<PostWithProfile[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) setUserId(data.user.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function load() {
      const supabase = createClient();
      let result: PostWithProfile[] = [];

      if (tab === "following") {
        const { data: following } = await supabase
          .from("follows")
          .select("followee_id")
          .eq("follower_id", userId!)
          .eq("status", "accepted");
        const ids = (following ?? []).map((f) => f.followee_id);
        if (ids.length > 0) {
          const { data, error } = await supabase
            .from("posts")
            .select(`${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url)`)
            .in("user_id", ids)
            .order("created_at", { ascending: false })
            .limit(30);
          if (error) console.error("following feed failed", error);
          result = (data ?? []) as unknown as PostWithProfile[];
        }
      } else {
        const { data, error } = await supabase
          .from("posts")
          .select(
            `${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url, is_private)`
          )
          .eq("profiles.is_private", false)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) console.error("public feed failed", error);
        result = (data ?? []) as unknown as PostWithProfile[];
      }

      if (!cancelled) setPosts(result);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, tab]);

  if (!userId) {
    return (
      <section className="mt-14 border-t border-line/60 pt-10 text-center">
        <p className="text-sm leading-loose text-ink-soft">
          ログインすると、フォロー中の人やみんなの投稿を見られます。
        </p>
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="ghost">ログイン</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-14 border-t border-line/60 pt-10">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("following")}
          className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
            tab === "following" ? "bg-sage-soft text-sage-deep" : "bg-cream-deep/50 text-ink-soft"
          }`}
        >
          フォロー中
        </button>
        <button
          type="button"
          onClick={() => setTab("everyone")}
          className={`relative z-10 touch-manipulation rounded-full px-4 py-2 text-sm transition-colors ${
            tab === "everyone" ? "bg-sage-soft text-sage-deep" : "bg-cream-deep/50 text-ink-soft"
          }`}
        >
          みんな
        </button>
      </div>

      <div className="mt-6">
        {posts === null && <p className="text-sm text-ink-soft">読み込み中…</p>}
        {posts !== null && posts.length === 0 && tab === "following" && (
          <p className="text-sm leading-loose text-ink-soft">
            まだ誰もフォローしていません。
            <br />
            <Link href="/search" className="underline underline-offset-4">
              ユーザーを探す
            </Link>
          </p>
        )}
        {posts !== null && posts.length === 0 && tab === "everyone" && (
          <p className="text-sm text-ink-soft">まだ投稿がありません。</p>
        )}
        {posts !== null && posts.length > 0 && (
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
