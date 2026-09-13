"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PostCard } from "@/components/PostCard";
import { createClient } from "@/lib/supabase/client";
import type { PostWithProfile } from "@/types/supabase";

const PAGE_SIZE = 6;
const POST_COLUMNS =
  "id, user_id, mission_text, duration_minutes, phone_mode, allowed_tools, note, comment, photo_path, created_at";

/**
 * プロフィール画面の「この人の遠回り」一覧。
 * 呼び出し元（app/u/[username]/page.tsx）が既にcan_view_follow_lists()で
 * 「そもそもこの一覧を見せてよいか」を判定した上でだけこのコンポーネントを
 * 描画するので、ここではpostsの通常のRLS（posts_select_visible）に
 * 従って素直に取得するだけでよい。追加の権限チェックはしない。
 */
export function ProfilePosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<PostWithProfile[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("posts")
      .select(`${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("profile posts failed", error);
        const result = (data ?? []) as unknown as PostWithProfile[];
        setPosts(result);
        setHasMore(result.length === PAGE_SIZE);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function loadMore() {
    if (!posts) return;
    setIsLoadingMore(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select(`${POST_COLUMNS}, profiles!inner(username, display_name, avatar_url)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(posts.length, posts.length + PAGE_SIZE - 1);
      if (error) console.error("profile posts (more) failed", error);
      const nextBatch = (data ?? []) as unknown as PostWithProfile[];
      setPosts([...posts, ...nextBatch]);
      setHasMore(nextBatch.length === PAGE_SIZE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (posts === null) return null;

  if (posts.length === 0) {
    return <p className="text-sm text-ink-soft/70">まだ遠回りの記録はありません。</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ul>
      {hasMore && (
        <Button variant="ghost" onClick={loadMore} disabled={isLoadingMore} className="w-full">
          {isLoadingMore ? "読み込み中…" : "もっと見る"}
        </Button>
      )}
    </div>
  );
}
