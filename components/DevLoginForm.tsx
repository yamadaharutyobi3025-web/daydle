"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/**
 * 開発環境専用。メール送信なしでテストアカウントをパスワードで
 * 切り替えるためのフォーム。本番のマジックリンクログイン
 * （app/login, app/auth/callback）とは完全に別経路で、
 * 既存のAuthフローには一切影響しない。
 *
 * 使うには、対象アカウントにあらかじめパスワードを設定しておく必要がある
 * （マジックリンクだけで作ったアカウントにはデフォルトでパスワードがない）。
 */
export function DevLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
        type="email"
        required
        autoComplete="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-2xl border border-line/80 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-sage"
      />
      {errorMessage && <p className="text-xs text-red-700/80">{errorMessage}</p>}
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "ログイン中…" : "開発用ログイン"}
      </Button>
    </form>
  );
}
