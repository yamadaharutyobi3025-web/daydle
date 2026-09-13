import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 開発環境専用。usernameを受け取り、
 *  1. service role権限でそのユーザーのメールアドレスを引き、
 *  2. supabase.auth.admin.updateUserById() でその場限りのパスワードを
 *     設定し、
 *  3. { email, password } を返す。
 * クライアント（DevLoginForm）はこれを使って、通常のanon keyでの
 * supabase.auth.signInWithPassword() でログインする。
 *
 * これにより、メール送信なしで何度でもアカウントを切り替えられる。
 * service role keyはこのRoute Handlerの外に出ない。
 *
 * 本番ビルド（next build）では常にprocess.env.NODE_ENVが"production"に
 * なるため、ここで404を返して機能自体を無効化する。
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let username: unknown;
  try {
    ({ username } = await request.json());
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "usernameを入力してください。" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEYが.env.localに設定されていません。" },
      { status: 500 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: `username "${username}" のユーザーが見つかりません。` },
      { status: 404 }
    );
  }

  const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(profile.id);
  if (getUserError || !userData.user?.email) {
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました。" }, { status: 500 });
  }

  const temporaryPassword = randomBytes(24).toString("hex");
  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
    password: temporaryPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ email: userData.user.email, password: temporaryPassword });
}
