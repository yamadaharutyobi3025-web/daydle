import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * service role keyを使う管理者権限クライアント。
 *
 * 開発環境専用のdev-login API（app/api/dev-login/route.ts）からのみ
 * 呼び出すこと。RLSを完全にバイパスするため、ブラウザに渡したり、
 * 通常のリクエスト処理で使ったりしてはいけない。
 *
 * "server-only"パッケージをimportしているため、万一クライアント
 * コンポーネントからこのファイルをimportしようとすると、その場で
 * ビルドエラーになる。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (or URL) is not configured");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
