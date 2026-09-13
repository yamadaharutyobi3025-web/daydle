-- Social v1: 投稿の「ひとこと」（やってみて、どうだった？）
--
-- 既存の posts.note は元々ジャーナル（/journal）の「ひとこと」を
-- そのまま流用していたが、今回の要望は投稿時点で改めて書く、
-- 投稿専用の短い感想。lib/storage.tsのReflection型（good/normal/meh/skipped
-- という満足度タグ）とは全く別物で紛らわしいため"reflection"は避け、
-- "comment"という列名にする。noteは触らずそのまま残す（後方互換のため
-- 削除しない。新規投稿では使わなくなるだけ）。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

alter table public.posts add column if not exists comment text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_comment_length'
  ) then
    alter table public.posts
      add constraint posts_comment_length
      check (comment is null or char_length(comment) <= 80);
  end if;
end $$;

-- postsは既にテーブル単位でanon/authenticatedへGRANT済み（0006）のため、
-- 列を増やすだけのこのマイグレーションに追加のGRANTは不要。
-- 既存行はcommentが自動的にNULLになり、そのまま問題なく表示できる。
