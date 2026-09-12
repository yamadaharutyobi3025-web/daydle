import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Supabaseセッションのリフレッシュだけを行う。
 * 認可判断（ログイン必須ページのリダイレクト等）はここでは行わず、
 * 各ページ/DAL側で行う（Next.js公式ガイドのDALパターンに合わせる）。
 *
 * Next.js 16でmiddleware.tsはproxy.tsに名称変更された
 * （node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md）。
 * export名も`middleware`ではなく`proxy`にする必要がある。
 */
export async function proxy(request: NextRequest) {
  // Supabase未設定（Social機能を使わない）でも、proxyは全ルートに
  // かかるため、既存のアプリ（今日/みんな/記録など）を壊さないよう
  // ここで何もせず抜ける。
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 呼ぶだけでよい。必要ならトークンをリフレッシュしてcookieに書き戻す。
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest\\.webmanifest).*)",
  ],
};
