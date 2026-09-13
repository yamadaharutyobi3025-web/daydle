"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { PostCard } from "@/components/PostCard";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PostWithProfile } from "@/types/supabase";

type Tab = "following" | "everyone";

type FeedResult = {
  tab: Tab;
  posts: PostWithProfile[];
  /** フォロー中タブの空表示の出し分けに使う（0人フォロー vs 未投稿）。 */
  followingCount?: number;
};

const POST_COLUMNS =
  "id, user_id, mission_text, duration_minutes, phone_mode, allowed_tools, comment, photo_path, created_at";

/**
 * 「みんな」画面の下に追加する、Supabaseの投稿フィード。
 * 既存の静的な「みんなの遠回り例」セクションはそのまま残し、
 * このセクションはその下に独立して追加する。
 *
 * 「みんな」タブは公開投稿のみを見せるため未ログインでも動く
 * （posts/profilesのRLSがanonにもselectを許可しているため）。
 * 「フォロー中」タブだけログインが必要。
 */
export function SocialFeed() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("everyone");
  const [result, setResult] = useState<FeedResult | null>(null);

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
    if (tab === "following" && !userId) return;

    let cancelled = false;

    async function load() {
      const supabase = createClient();

      if (tab === "following") {
        const { data: following } = await supabase
          .from("follows")
          .select("followee_id")
          .eq("follower_id", userId!)
          .eq("status", "accepted");
        const ids = (following ?? []).map((f) => f.followee_id);

        let posts: PostWithProfile[] = [];
        if (ids.length > 0) {
          const { data, error } = await supabase
            .from("posts")
            .select(`${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url)`)
            .in("user_id", ids)
            .order("created_at", { ascending: false })
            .limit(30);
          if (error) console.error("following feed failed", error);
          posts = (data ?? []) as unknown as PostWithProfile[];
        }
        if (!cancelled) setResult({ tab: "following", posts, followingCount: ids.length });
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select(
          `${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url, is_private)`
        )
        .eq("profiles.is_private", false)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) console.error("public feed failed", error);
      if (!cancelled) {
        setResult({ tab: "everyone", posts: (data ?? []) as unknown as PostWithProfile[] });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, tab]);

  // 別タブの結果が残っている間は「読み込み中」扱いにして、
  // 切り替え直後に前のタブの投稿が一瞬見えてしまうのを防ぐ。
  const current = result?.tab === tab ? result : null;

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
        {tab === "following" && !userId ? (
          <div className="text-center">
            <p className="text-sm leading-loose text-ink-soft">
              ログインすると、フォロー中の人の投稿を見られます。
            </p>
            <Link href="/login" className="mt-4 inline-block">
              <Button variant="ghost">ログイン</Button>
            </Link>
          </div>
        ) : current === null ? (
          <p className="text-sm text-ink-soft">読み込み中…</p>
        ) : current.posts.length === 0 ? (
          <p className="text-sm leading-loose text-ink-soft">
            {tab === "following" ? (
              current.followingCount === 0 ? (
                <>
                  まだ誰もフォローしていません。
                  <br />
                  <Link href="/search" className="underline underline-offset-4">
                    ユーザーを探す
                  </Link>
                </>
              ) : (
                "まだフォロー中の遠回りはありません。"
              )
            ) : (
              "まだ投稿がありません。"
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {current.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
