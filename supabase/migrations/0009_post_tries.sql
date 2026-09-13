-- Social v1: 「私もやってみる」から実際に完了した人を記録する
--
-- 「私もやってみる」を押しただけではカウントしない。押した後、実際に
-- 完了（できた）した時点でだけ1行記録される（components/TodayScreen.tsx
-- のhandleComplete()から、lib/postTries.tsのrecordPostTryCompletion()
-- 経由で書き込む）。いいね・人気数・ランキングのような競争演出ではなく、
-- 「誰かがこれを実際にやってみた」という気配だけを見せるための最小限の記録。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

create table if not exists public.post_tries (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_tries enable row level security;

grant select, insert on public.post_tries to authenticated;

-- 直接テーブルを見られるのは自分の行だけ。他人がやってみたかどうかの
-- 一覧は下のSECURITY DEFINER関数経由でのみ提供する（投稿自体の可視性、
-- 投稿者本人の除外、やった人自身のプライバシーを一箇所で判定するため）。
create policy "post_tries_select_own"
  on public.post_tries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "post_tries_insert_own"
  on public.post_tries for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- get_post_tries（SECURITY DEFINER）
-- ============================================================
-- SECURITY DEFINERの関数は本文内でのテーブル参照が定義者(作成者)の権限で
-- 行われるため、呼び出し元ロール（anon/authenticated）にposts/profiles/
-- follows/post_triesそれぞれへの追加GRANTは不要（get_followers等と同じ
-- 方式）。
--
-- 返すのは、以下の条件をすべて満たす「やってみた人」だけ：
--   1. 呼び出し元(auth.uid())がその投稿自体を見られること
--      （postsのRLS = posts_select_visible と同じ判定をここでも行う）
--   2. 投稿者本人は含めない
--   3. やった人自身が「公開」、または呼び出し元がその人の承認済み
--      フォロワー、または呼び出し元本人であること
-- 「ほか◯人」の人数も、この関数が返した後の配列の長さから計算する
-- （非公開で見えない人を人数にも含めない＝件数からの漏洩を防ぐ）。

create or replace function public.get_post_tries(target_post_id uuid)
returns table (id uuid, username text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name
  from public.post_tries pt
  join public.posts po on po.id = pt.post_id
  join public.profiles p on p.id = pt.user_id
  where pt.post_id = target_post_id
    and pt.user_id <> po.user_id
    and (
      auth.uid() = po.user_id
      or exists (
        select 1 from public.profiles pp
        where pp.id = po.user_id and pp.is_private = false
      )
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.followee_id = po.user_id
          and f.status = 'accepted'
      )
    )
    and (
      p.is_private = false
      or auth.uid() = pt.user_id
      or exists (
        select 1 from public.follows f2
        where f2.follower_id = auth.uid()
          and f2.followee_id = pt.user_id
          and f2.status = 'accepted'
      )
    )
  order by pt.completed_at asc;
$$;

grant execute on function public.get_post_tries(uuid) to anon, authenticated;
