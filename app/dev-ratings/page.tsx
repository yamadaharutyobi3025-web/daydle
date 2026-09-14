import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DevRatingsView } from "@/components/DevRatingsView";

/**
 * 開発環境専用。「今日」画面で付けた推薦品質の評価（◎/○/△/×）の
 * 一覧・集計を見るためのページ。/dev-login と同じ理由で、
 * NODE_ENV!=="development"ならページごと404にする（本番JSバンドルに
 * 含まれていても、リクエスト時にこのページ自体へ到達する経路が無い）。
 */
export default function DevRatingsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-6 pb-16 pt-14">
      <Logo size="md" />
      <h1 className="mt-8 font-serif-jp text-[22px] leading-[1.8] text-ink">
        推薦品質の評価ログ
      </h1>
      <p className="mt-4 text-sm leading-[1.9] text-ink-soft">
        開発環境専用の確認画面です。「今日」画面で本人アカウントが付けた
        ◎/○/△/×の一覧と集計です。データはSupabaseに保存されており、
        本人以外はログインしても見られません（RLSで制限）。
      </p>
      <DevRatingsView />
    </main>
  );
}
