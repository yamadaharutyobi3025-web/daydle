-- 実使用評価: 「今日」画面でのミッション評価（◎/○/△/×）をSupabaseへ保存する。
--
-- 対象はDAYDLE本人（下記の固定user_id）のみ。一般ユーザーには
-- クライアント側（MissionRatingWidget）でも表示しないが、本当の安全境界は
-- このRLS側：auth.uid() = user_id に加えて user_id 自体を本人の固定UUIDに
-- 絞っているため、万一他のログイン済みユーザーが自分のuser_idで行を
-- 作ろうとしてもinsert自体が拒否される。
--
-- daily_completions/posts/follows/notifications等とは完全に独立した
-- テーブルのため、1日1回制限・記録・投稿・フォロー・通知のいずれにも
-- 影響しない。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

create table if not exists public.mission_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- types/context.ts の Situation / Feeling と同じ値をそのまま使う。
  -- 質問未回答（localStorageが端末側で消えている等）のケースもあり得るため、
  -- 両方ともnull許容にしておく。
  situation text check (situation in ('home', 'outside', 'transit', 'work_school', 'unsure')),
  feeling text check (
    feeling in ('tired', 'bored', 'calm_seeking', 'want_to_do_something', 'good_mood', 'neutral')
  ),
  mission_id text not null,
  mission_text text not null,
  rating text not null check (rating in ('great', 'good', 'meh', 'bad')),
  created_at timestamptz not null default now()
);

alter table public.mission_ratings enable row level security;

grant select, insert on public.mission_ratings to authenticated;
grant all on public.mission_ratings to service_role;

create policy "mission_ratings_select_owner"
  on public.mission_ratings for select
  to authenticated
  using (
    auth.uid() = user_id
    and user_id = '2233ff36-dc4c-45db-a696-3453610242fa'::uuid
  );

create policy "mission_ratings_insert_owner"
  on public.mission_ratings for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and user_id = '2233ff36-dc4c-45db-a696-3453610242fa'::uuid
  );
