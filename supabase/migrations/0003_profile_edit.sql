-- Social v1 段階2: プロフィール編集
-- display_name/bioの長さ制限と、アバター画像用のpublic bucketを追加する。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

-- ============================================================
-- profiles: 長さ制限
-- ============================================================
-- 荒らし・極端に長い入力を防ぐための軽い制約。存在しなければ追加する。

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_display_name_length'
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) <= 30);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_bio_length'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length
      check (bio is null or char_length(bio) <= 160);
  end if;
end $$;

-- ============================================================
-- avatars（public bucket）
-- ============================================================
-- avatar_urlはprofilesの他の列と同じく「誰でも見てよい」情報なので、
-- post-photosとは異なり公開バケットにする。パスは常に
-- "{user_id}/avatar.jpg" で固定し、更新時は上書き（upsert）する。

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select_all"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
