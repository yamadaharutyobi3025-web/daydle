import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * post-photosはprivate bucketなので、写真の表示は必ずここを通す。
 *
 * 1. リクエストしたユーザーのセッションでpostsをselectする
 *    （postsのRLSがそのまま「この投稿を見てよいか」の判定になる）。
 * 2. 行が返ってくれば閲覧可能と確定。service roleクライアントで
 *    その場限りのsigned URLを発行して返す。
 * 3. 行が返ってこなければ404（signed URLは発行しない）。
 *
 * DBにはphoto_path（バケット内パス）しか保存していないため、
 * このRoute Handlerを経由しない限り写真は誰にも見えない。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("photo_path")
    .eq("id", postId)
    .maybeSingle();

  if (!post || !post.photo_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  const { data, error } = await admin.storage
    .from("post-photos")
    .createSignedUrl(post.photo_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create signed url" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
