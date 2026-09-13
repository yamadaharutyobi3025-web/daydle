"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/**
 * 開発環境専用。メール送信なしでテストアカウントを切り替えるための
 * フォーム。本番のマジックリンクログイン（app/login, app/auth/callback）
 * とは完全に別経路で、既存のAuthフローには一切影響しない。
 *
 * 流れ: usernameを/api/dev-loginに送る（service role keyを使うのは
 * そのRoute Handlerの中だけ）→ その場限りのパスワードとメールアドレスが
 * 返る → 通常のanon keyでのsignInWithPasswordでログインする。
 * サーバー側の実装は app/api/dev-login/route.ts を参照。
 */
export function DevLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.error ?? "ログインに失敗しました。");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-3">
      <input
        type="text"
        required
        placeholder="username（例: yamada）"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
      />
      {errorMessage && <p className="text-xs text-red-700/80">{errorMessage}</p>}
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "ログイン中…" : "このアカウントでログイン"}
      </Button>
    </form>
  );
}
