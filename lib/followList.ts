import { createClient } from "@/lib/supabase/server";
import type { FollowListItem } from "@/types/supabase";

export type FollowListKind = "followers" | "following";

export type FollowListResult =
  | { found: false }
  | {
      found: true;
      profile: { id: string; username: string; display_name: string | null; is_private: boolean };
      canView: boolean;
      items: FollowListItem[];
    };

/**
 * フォロワー/フォロー中一覧の取得。
 * 「どちらの一覧を見ているかでどちらの公開設定を見るべきかが変わる」
 * ため、可視性判定はここに集約し、can_view_follow_lists()（DB関数）で
 * サーバー側に強制させる。フロント側の分岐だけに頼らない。
 */
export async function loadFollowList(
  username: string,
  kind: FollowListKind
): Promise<FollowListResult> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_private")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { found: false };

  const { data: canView } = await supabase.rpc("can_view_follow_lists", {
    target: profile.id,
  });

  if (!canView) {
    return { found: true, profile, canView: false, items: [] };
  }

  const { data: items } = await supabase.rpc(
    kind === "followers" ? "get_followers" : "get_following",
    { target: profile.id }
  );

  return { found: true, profile, canView: true, items: items ?? [] };
}
