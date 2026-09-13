"use client";

import { useEffect, useState } from "react";

/**
 * post-photosはprivate bucketなので、公開URLを直接埋め込むことはできない。
 * 表示のたびに /api/posts/[postId]/photo-url から短命のsigned URLを取得する。
 */
export function PostPhoto({ postId }: { postId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${postId}/photo-url`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) setUrl(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="mt-3 h-56 w-full rounded-2xl object-cover" />
  );
}
