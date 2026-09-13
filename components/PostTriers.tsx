"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Trier = { id: string; username: string; display_name: string | null };

/**
 * 「◯◯さんもやってみました」の表示。投稿カード・投稿詳細のどちらでも
 * この同じコンポーネントを使うことで、表示内容を完全に一致させる。
 *
 * get_post_tries()（SECURITY DEFINER）が既に、投稿の可視性・投稿者本人の
 * 除外・やった人自身のプライバシーをすべて判定した上で返すため、ここでは
 * 返ってきた配列をそのまま「最大2名+ほか◯人」に整形するだけでよい
 * （非公開で見えない人はこの配列に含まれないので、人数にも表れない）。
 */
export function PostTriers({ postId }: { postId: string }) {
  const [triers, setTriers] = useState<Trier[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .rpc("get_post_tries", { target_post_id: postId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("get_post_tries failed", error);
          setTriers([]);
          return;
        }
        setTriers(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!triers || triers.length === 0) return null;

  return (
    <p className="pointer-events-none mt-3 text-[11px] leading-relaxed text-ink-soft/60">
      {triers.length === 1 && (
        <>
          <NameLink trier={triers[0]} />
          さんもやってみました
        </>
      )}
      {triers.length === 2 && (
        <>
          <NameLink trier={triers[0]} />
          さん、<NameLink trier={triers[1]} />
          さんもやってみました
        </>
      )}
      {triers.length >= 3 && (
        <>
          <NameLink trier={triers[0]} />
          さんほか{triers.length - 1}人もやってみました
        </>
      )}
    </p>
  );
}

function NameLink({ trier }: { trier: Trier }) {
  return (
    <Link
      href={`/u/${trier.username}`}
      className="pointer-events-auto relative z-10 text-ink-soft underline-offset-2 hover:underline"
    >
      {trier.display_name || trier.username}
    </Link>
  );
}
