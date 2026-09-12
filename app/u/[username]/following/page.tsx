import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { UserListItem } from "@/components/UserListItem";
import { loadFollowList } from "@/lib/followList";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await loadFollowList(username, "following");
  if (!result.found) notFound();

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-14">
      <Logo size="sm" muted />
      <h1 className="mt-8 font-serif-jp text-[20px] text-ink">
        @{result.profile.username} のフォロー中
      </h1>

      {!result.canView ? (
        <p className="mt-10 text-sm text-ink-soft">このアカウントは非公開です。</p>
      ) : result.items.length === 0 ? (
        <p className="mt-10 text-sm text-ink-soft">まだいません。</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {result.items.map((item) => (
            <li key={item.id}>
              <UserListItem user={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
