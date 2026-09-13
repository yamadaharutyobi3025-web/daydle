import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DevLoginForm } from "@/components/DevLoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * 開発環境専用のログイン画面。
 *
 * process.env.NODE_ENV は Next.js のビルド設定で決まるフレームワーク標準の
 * 値で、`next build`（本番ビルド。Vercel上のproduction/previewいずれも
 * これを使う）では常に "production" になる。ホスト名判定と違い、
 * リクエストヘッダの偽装や設定ミスの影響を受けない。
 *
 * サーバーコンポーネントでこのチェックをしているため、本番ビルドでは
 * このページ自体がリクエスト時に404になり、下のDevLoginForm（クライアント
 * コンポーネント）が本番のJSバンドルに含まれていても実行される経路がない。
 */
export default function DevLoginPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        開発用ログイン
      </h1>
      <p className="mt-4 text-sm leading-[1.9] text-ink-soft">
        開発環境専用です。既存アカウントのusernameを入力するだけで、
        メール送信なしにログインできます（サーバー側でその場限りの
        パスワードを発行します）。本番では使えません。
      </p>

      {!isSupabaseConfigured() ? (
        <p className="mt-10 text-sm text-ink-soft/70">Supabaseが未設定です。</p>
      ) : (
        <DevLoginForm />
      )}
    </main>
  );
}
