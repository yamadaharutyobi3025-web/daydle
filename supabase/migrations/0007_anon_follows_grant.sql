-- posts_select_visible ポリシー（0006）のUSING句は、可視性判定のために
-- public.follows をサブクエリで参照する。この参照は「実行しているロール」
-- （＝リクエストしてきたロールそのもの。anonキーでのアクセスならanon）の
-- 権限で行われるため、anonにfollowsへのSELECT権限がないと、
-- postsをanonで検索しただけで
-- 「permission denied for table follows」になってしまう
-- （followsの行自体はfollows側のRLSで引き続き見えない。ここで許可するのは
-- あくまで「他のテーブルのRLS判定のためにfollowsを参照する」ための権限）。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

grant select on public.follows to anon;
