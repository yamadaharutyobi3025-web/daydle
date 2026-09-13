import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dateKey, formatJapaneseDate } from "@/lib/date";

type NotificationRow = {
  id: string;
  type: "follow_request" | "follow_accepted" | "post_try_completed";
  created_at: string;
  read_at: string | null;
  post_id: string | null;
  profiles: { username: string; display_name: string | null; avatar_url: string | null };
  posts: { mission_text: string } | null;
};

/**
 * 通知一覧。開いた時点でその場にある未読をまとめて既読にする
 * （1件ずつのクリック時既読ではなく、一覧を開いた時点での一括既読。
 * 「実装しやすい方」として、より単純なこちらを採用）。
 * 未読/既読の点は、この更新をかける前に控えた状態を使って描画する。
 */
export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, created_at, read_at, post_id, profiles!inner(username, display_name, avatar_url), posts(mission_text)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as unknown as NotificationRow[];
  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />
      <h1 className="mt-8 font-serif-jp text-[20px] leading-[1.8] text-ink">通知</h1>

      {notifications.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft/70">まだ通知はありません。</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-1">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} wasUnread={unreadIds.includes(n.id)} />
          ))}
        </ul>
      )}
    </main>
  );
}

function NotificationItem({
  notification,
  wasUnread,
}: {
  notification: NotificationRow;
  wasUnread: boolean;
}) {
  const name = notification.profiles.display_name || notification.profiles.username;
  const createdAt = new Date(notification.created_at);
  const dateLabel = `${formatJapaneseDate(dateKey(createdAt))} ${createdAt.toLocaleTimeString(
    "ja-JP",
    { hour: "2-digit", minute: "2-digit" }
  )}`;

  const message =
    notification.type === "follow_request"
      ? "さんがフォローを申請しました"
      : notification.type === "follow_accepted"
        ? "さんがフォローを承認しました"
        : `さんが「${notification.posts?.mission_text ?? "投稿"}」をやってみました`;

  const primaryHref =
    notification.type === "post_try_completed" && notification.post_id
      ? `/post/${notification.post_id}`
      : `/u/${notification.profiles.username}`;

  return (
    <li className="relative rounded-2xl px-2 py-3">
      <Link href={primaryHref} className="absolute inset-0 z-0 rounded-2xl" />

      <div className="flex items-start gap-3">
        {wasUnread && (
          <span
            className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage"
            aria-hidden="true"
          />
        )}
        {!wasUnread && <span className="w-1.5 flex-shrink-0" aria-hidden="true" />}

        <Link
          href={`/u/${notification.profiles.username}`}
          className="relative z-10 flex-shrink-0 touch-manipulation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={notification.profiles.avatar_url || "/icon-192"}
            alt=""
            className="h-9 w-9 rounded-full object-cover bg-cream-deep/60"
          />
        </Link>

        <div className="min-w-0 flex-1 pointer-events-none">
          <p className="text-sm leading-relaxed text-ink">
            <Link
              href={`/u/${notification.profiles.username}`}
              className="pointer-events-auto relative z-10 text-ink underline-offset-2 hover:underline"
            >
              {name}
            </Link>
            {message}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-soft/50">{dateLabel}</p>
        </div>
      </div>
    </li>
  );
}
