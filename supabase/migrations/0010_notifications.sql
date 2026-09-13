-- Social v1: 最小限の通知機能
--
-- 対象は3種類だけ:
--   1. follow_request      … 自分にフォロー申請が届いた
--   2. follow_accepted     … 自分が送ったフォロー申請が承認された
--   3. post_try_completed  … 自分の投稿を誰かが「私もやってみる」→実際に完了した
--
-- 生成はアプリ側から個別に呼ぶのではなく、follows/post_triesの変化を
-- 検知するDBトリガーで行う。理由:
--   - フォロー・承認・完了はすでに複数の画面/関数から書き込まれており
--     （FollowButton、FollowRequestActions、lib/postTries.ts）、
--     アプリ側で通知INSERTを個別に足すと呼び忘れ・二重呼び出しの
--     リスクがある
--   - follows.status='pending'の行は(follower_id, followee_id)の
--     主キーにより同時に1行しか存在できず、post_triesも
--     (post_id, user_id)の主キー+upsert(ignoreDuplicates)により
--     1人1回しか行ができないため、「INSERTが実際に起きた回数だけ
--     トリガーを1回ずつ発火させる」だけで自然に重複通知を防げる
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- 通知の受信者
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('follow_request', 'follow_accepted', 'post_try_completed')),
  -- 誰の行動によって発生したか
  actor_id uuid not null references auth.users (id) on delete cascade,
  -- post_try_completedのときだけ使う。他の種別ではnull
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- nullなら未読
  read_at timestamptz,
  -- フィード取得時にPostgRESTでprofilesを直接埋め込めるようにするための
  -- 追加の外部キー（postsのときと同じ理由。profiles.idは常に
  -- auth.users.idと一致するため矛盾しない）。
  constraint notifications_actor_profiles_fkey foreign key (actor_id) references public.profiles (id) on delete cascade
);

alter table public.notifications enable row level security;

-- 直接INSERTする権限は誰にも与えない（下のSECURITY DEFINERトリガー
-- 経由でのみ作られる。クライアントが他人の通知欄へ何かを書き込む
-- 手段を作らないため）。
grant select, update on public.notifications to authenticated;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- 既読化（read_atの更新）のみ本人に許可する。
create policy "notifications_update_own_read_at"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 1. follow_request: followsにpending行がINSERTされたとき
-- ============================================================
create or replace function public.notify_follow_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, actor_id)
    values (new.followee_id, 'follow_request', new.follower_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_follow_request on public.follows;
create trigger notifications_follow_request
  after insert on public.follows
  for each row execute function public.notify_follow_request();

-- ============================================================
-- 2. follow_accepted: followsがpending -> acceptedに変わったとき
-- ============================================================
create or replace function public.notify_follow_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, type, actor_id)
    values (new.follower_id, 'follow_accepted', new.followee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_follow_accepted on public.follows;
create trigger notifications_follow_accepted
  after update on public.follows
  for each row execute function public.notify_follow_accepted();

-- ============================================================
-- 3. post_try_completed: post_triesに行がINSERTされたとき
--    （＝「私もやってみる」から実際に完了した瞬間。押しただけの
--    時点ではpost_tries自体に行ができないため、ここでも通知しない）
-- ============================================================
create or replace function public.notify_post_try_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  poster_id uuid;
begin
  select user_id into poster_id from public.posts where id = new.post_id;
  -- 投稿者本人が自分の投稿を「やってみた」場合は通知しない。
  if poster_id is not null and poster_id <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, post_id)
    values (poster_id, 'post_try_completed', new.user_id, new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_post_try_completed on public.post_tries;
create trigger notifications_post_try_completed
  after insert on public.post_tries
  for each row execute function public.notify_post_try_completed();
