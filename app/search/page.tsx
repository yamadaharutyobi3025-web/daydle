"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { UserListItem } from "@/components/UserListItem";
import { createClient } from "@/lib/supabase/client";
import type { FollowListItem } from "@/types/supabase";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FollowListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const supabase = createClient();
      const columns = "id, username, display_name, avatar_url";
      // usernameとdisplay_nameを別々に検索してから結合する
      // （PostgRESTのor()フィルタ文字列に検索語をそのまま埋め込むと、
      // 検索語に , や ) 等が含まれた際に壊れるため、この形の方が安全）。
      const [byUsername, byDisplayName] = await Promise.all([
        supabase.from("profiles").select(columns).ilike("username", `%${q}%`).limit(20),
        supabase.from("profiles").select(columns).ilike("display_name", `%${q}%`).limit(20),
      ]);
      if (byUsername.error || byDisplayName.error) {
        console.error("user search failed", byUsername.error, byDisplayName.error);
        setResults([]);
        return;
      }
      const merged = new Map<string, FollowListItem>();
      for (const user of [...(byUsername.data ?? []), ...(byDisplayName.data ?? [])]) {
        merged.set(user.id, user);
      }
      setResults(Array.from(merged.values()));
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />
      <h1 className="mt-8 font-serif-jp text-[20px] text-ink">ユーザーを探す</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="usernameまたは表示名"
          className="w-full rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
        />
      </form>

      <div className="mt-8">
        {isSearching && <p className="text-sm text-ink-soft">検索中…</p>}
        {!isSearching && hasSearched && results.length === 0 && (
          <p className="text-sm text-ink-soft">見つかりませんでした。</p>
        )}
        {!isSearching && results.length > 0 && (
          <ul className="flex flex-col gap-4">
            {results.map((user) => (
              <li key={user.id}>
                <UserListItem user={user} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
