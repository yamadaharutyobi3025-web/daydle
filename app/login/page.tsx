"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        ログイン
      </h1>
      <p className="mt-4 text-sm leading-[1.9] text-ink-soft">
        Social機能（プロフィール・フォロー・投稿）を使う場合のみ、
        <br />
        ログインが必要です。
        <br />
        使わない場合はそのままアプリを使い続けられます。
      </p>

      {!isSupabaseConfigured() ? (
        <p className="mt-10 text-sm leading-[1.9] text-ink-soft/70">
          Social機能はまだ準備中です。
        </p>
      ) : status === "sent" ? (
        <p className="mt-10 text-sm leading-[1.9] text-sage-deep">
          {email} 宛にログイン用のリンクを送りました。
          <br />
          メール内のリンクを開いてログインを完了してください。
        </p>
      ) : (
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
          {status === "error" && (
            <p className="text-xs text-red-700/80">{errorMessage}</p>
          )}
          <Button type="submit" disabled={status === "sending"}>
            ログイン用リンクを送る
          </Button>
        </form>
      )}

      {process.env.NODE_ENV === "development" && (
        <Link
          href="/dev-login"
          className="mt-6 text-center text-xs text-ink-soft/60 underline underline-offset-4"
        >
          (開発用) パスワードでログイン
        </Link>
      )}
    </main>
  );
}
