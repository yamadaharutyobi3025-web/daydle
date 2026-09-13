"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 「最近投稿した人」を5人に絞り込むために、重複ユーザーを見込んで
// 少し広めに直近の投稿を取得してから、クライアント側で人単位に
// 間引く（ランキング・人気度の計算ではなく、単なる重複排除のため）。
const FETCH_LIMIT = 50;
const MAX_SHOWN = 5;

type Poster = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PostRow = {
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null };
};

/**
 * 「みんな」画面の投稿フィード上部に置く、控えめな「最近遠回りした人」。
 * おすすめ・人気度・ランキングではなく、単に直近に投稿した人を新しい順に
 * 重複なく並べるだけ。フォロワー数・投稿数などは一切表示しない。
 *
 * 可視性はpostsの通常のRLS（posts_select_visible）にそのまま従う。
 * 追加の権限チェックはしていない — 非公開ユーザーの投稿は、閲覧者が
 * 本人か承認済みフォロワーでない限りそもそもこのクエリに含まれないため、
 * 自然に「表示しない」になる（未ログインなら公開ユーザーの投稿だけが
 * 返る）。
 */
export function RecentPosters() {
  const [posters, setPosters] = useState<Poster[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("posts")
        .select("user_id, profiles!inner(username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT);

      if (cancelled) return;
      if (error) {
        console.error("recent posters failed", error);
        setPosters([]);
        return;
      }

      const seen = new Set<string>();
      const result: Poster[] = [];
      for (const row of (data ?? []) as unknown as PostRow[]) {
        if (row.user_id === user?.id) continue; // 自分自身は除外
        if (seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        result.push({ id: row.user_id, ...row.profiles });
        if (result.length >= MAX_SHOWN) break;
      }
      setPosters(result);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!posters || posters.length === 0) return null;

  return (
    <section className="mb-10">
      <p className="text-[11px] tracking-wide text-ink-soft/50">最近遠回りした人</p>
      <ul className="mt-3 flex gap-4 overflow-x-auto pb-1">
        {posters.map((poster) => (
          <li key={poster.id} className="flex-shrink-0">
            <Link
              href={`/u/${poster.username}`}
              className="flex w-16 flex-col items-center gap-1 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.avatar_url || "/icon-192"}
                alt=""
                className="h-11 w-11 rounded-full object-cover bg-cream-deep/60"
              />
              <span className="w-full truncate text-[11px] text-ink-soft">
                {poster.display_name || poster.username}
              </span>
              <span className="w-full truncate text-[10px] text-ink-soft/50">
                @{poster.username}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
