-- Social v1 段階4: 投稿
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

-- ============================================================
-- posts
-- ============================================================
-- Context情報（場所・予定・気分・同席者）や座標、いいね数・XPに相当する
-- 列は一切持たない。投稿時点で見えていた内容（本文・所要時間・
-- PHONE MODE・ひとこと・写真）だけをそのままスナップショットとして保存する
-- （missionIdの参照ではない。ミッション自体が将来変わっても投稿は
-- 変わらないようにするため）。

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_text text not null,
  duration_minutes integer not null,
  phone_mode text not null check (phone_mode in ('offline', 'tool', 'connect')),
  allowed_tools text[] not null default '{}',
  note text,
  -- バケット内パスのみ。恒久URL・署名付きURLはここには保存しない。
  -- 例: "{user_id}/{post_id}.jpg"
  photo_path text,
  created_at timestamptz not null default now(),
  -- フィード取得時にPostgRESTでprofilesを直接埋め込めるようにするための
  -- 追加の外部キー（profiles.id は常に auth.users.id と一致するため、
  -- 上のauth.users参照と矛盾しない）。
  constraint posts_user_id_profiles_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
grant insert, delete on public.posts to authenticated;

-- 可視性: 本人の投稿、または投稿者が公開アカウント、または投稿者への
-- 承認済みフォローがある場合のみ。
create policy "posts_select_visible"
  on public.posts for select
  to anon, authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = posts.user_id and p.is_private = false
    )
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.followee_id = posts.user_id
        and f.status = 'accepted'
    )
  );

create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- updateは許可しない（投稿の改変はしない）。削除のみ本人が可能。
create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- Storage: post-photos（private bucket）
-- ============================================================
-- 常にprivate。表示は signed URL 発行専用のRoute Handler
-- (app/api/posts/[postId]/photo-url) 経由のみで、postsのRLSがそのまま
-- 閲覧可否チェックになる。storage.objectsにselectポリシーは作らない。

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', false)
on conflict (id) do nothing;

create policy "post_photos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post_photos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
