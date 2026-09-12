-- Social v1 段階3: フォロー/フォロワー
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

-- ============================================================
-- follows
-- ============================================================

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self_follow check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

grant select, insert, update, delete on public.follows to authenticated;

-- statusはクライアントの指定を信用せず、対象アカウントの現在のis_private
-- を見てサーバー側で強制決定する（非公開アカウントに'accepted'を
-- 送りつける申請バイパスを防ぐ）。
create or replace function public.follows_set_status()
returns trigger
language plpgsql
as $$
declare
  target_is_private boolean;
begin
  select is_private into target_is_private
  from public.profiles
  where id = new.followee_id;

  new.status := case when coalesce(target_is_private, true) then 'pending' else 'accepted' end;
  return new;
end;
$$;

drop trigger if exists follows_set_status_trigger on public.follows;
create trigger follows_set_status_trigger
  before insert on public.follows
  for each row execute function public.follows_set_status();

-- select: 自分が当事者（フォロー中／フォロワー／自分宛の申請）の行だけ。
-- 他人同士のフォロー関係の一覧は、下のSECURITY DEFINER関数経由でのみ許可する。
create policy "follows_select_own"
  on public.follows for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);

create policy "follows_insert_own"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

-- 承認（pending -> accepted）だけを許可。相手（followee）本人のみ。
create policy "follows_update_approve"
  on public.follows for update
  to authenticated
  using (auth.uid() = followee_id and status = 'pending')
  with check (auth.uid() = followee_id and status = 'accepted');

-- フォロー解除・申請の取り消し・申請の却下
create policy "follows_delete_own"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = followee_id);

-- ============================================================
-- フォロー数・一覧の取得（SECURITY DEFINER）
-- ============================================================
-- 「フォロー中一覧を見ているのか、フォロワー一覧を見ているのか」で
-- どちらの公開設定を見るべきかが変わるため、素のテーブルRLSの行単位の
-- 条件だけでは非公開アカウントの関係が漏れる組み合わせを作れてしまう。
-- そのため一覧・件数はテーブルを直接見せず、関数経由でのみ提供する。
--
-- 許可条件: 対象アカウント(target)が公開、または閲覧者が対象本人、
-- または閲覧者が対象の承認済みフォロワーのいずれか。

create or replace function public.can_view_follow_lists(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select not is_private from public.profiles where id = target), false)
    or coalesce(auth.uid() = target, false)
    or exists (
      select 1 from public.follows
      where follower_id = auth.uid() and followee_id = target and status = 'accepted'
    );
$$;

-- 件数は競争目的の表示ではなく、公開/非公開の判断材料として常に返す。
create or replace function public.get_follow_counts(target uuid)
returns table (followers_count bigint, following_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.follows where followee_id = target and status = 'accepted'),
    (select count(*) from public.follows where follower_id = target and status = 'accepted');
$$;

create or replace function public.get_followers(target uuid)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = target
    and f.status = 'accepted'
    and public.can_view_follow_lists(target);
$$;

create or replace function public.get_following(target uuid)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.follows f
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = target
    and f.status = 'accepted'
    and public.can_view_follow_lists(target);
$$;

grant execute on function public.can_view_follow_lists(uuid) to anon, authenticated;
grant execute on function public.get_follow_counts(uuid) to anon, authenticated;
grant execute on function public.get_followers(uuid) to anon, authenticated;
grant execute on function public.get_following(uuid) to anon, authenticated;
