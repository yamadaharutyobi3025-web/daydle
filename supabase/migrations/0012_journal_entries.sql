-- 実ユーザーテスト向け: 「今日の完了記録」をSupabaseへユーザー単位で保存する。
--
-- 対象は「できた」まで到達した記録だけ（accepted/declinedはログイン不要の
-- 一時状態のまま、今まで通り端末ローカルのみで扱う）。1人1日1件
-- （unique(user_id, date)）とし、note/photo/reflectionは後から同じ行への
-- updateで追記される（完了直後は両方null、翌日のふりかえりでreflectionが、
-- /journalでnote/photo_pathが入る）。
--
-- 「みんな」（public.posts）とは完全に独立したテーブル。journalの内容は
-- ユーザーが明示的に「投稿する」を押したときだけ、アプリ側でpostsへ
-- コピーされる（このテーブルからpostsへの自動連携は無い）。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mission_id text not null,
  -- 完了時点の本文スナップショット（postsと同じ思想。ミッション文言が
  -- 将来変わっても、過去の記録の表示内容は変わらないようにするため）。
  mission_text text not null,
  reflection text check (reflection in ('good', 'normal', 'meh', 'skipped')),
  note text,
  -- Supabase Storage（journal-photosバケット）内のパスのみ。画像本体は持たない。
  photo_path text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.journal_entries enable row level security;

grant select, insert, update, delete on public.journal_entries to authenticated;

-- SELECT/INSERT/UPDATE/DELETEすべてauth.uid() = user_idを基準にする。
-- UPDATEはusing/with checkの両方に付けることで、他人の行を自分名義に
-- 書き換えることも、自分の行を他人名義に書き換えることも防ぐ。
create policy "journal_entries_select_own"
  on public.journal_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "journal_entries_insert_own"
  on public.journal_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "journal_entries_update_own"
  on public.journal_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journal_entries_delete_own"
  on public.journal_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- profiles.updated_atと同じ set_updated_at() トリガー関数（0001で作成済み）を再利用する。
drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- Storage: journal-photos（private bucket）
-- ============================================================
-- postsの写真（post-photos）と違い、journalの写真は「本人のみが見られる」
-- という単純な可視性ルールのため、signed URL発行用のRoute Handlerを
-- 経由せず、storage.objectsに直接SELECTポリシーを置く
-- （フォルダ名=auth.uid()の判定だけで、可視性ルールを過不足なく表現できるため）。
-- パスは "{user_id}/{date}.jpg"。

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', false)
on conflict (id) do nothing;

create policy "journal_photos_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "journal_photos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "journal_photos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'journal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
