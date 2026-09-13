-- dev-login（app/api/dev-login）がservice role keyでprofilesを読めるように
-- するための追加GRANT。
--
-- service_roleはRLSを完全にバイパスするが、それとは別にテーブルへの
-- GRANT自体は必要（0002_grants.sqlでanon/authenticatedに対して行ったのと
-- 同じ理由）。このプロジェクトはSupabaseダッシュボードのテーブルエディタ
-- ではなくSQL Editorで作成しているため、通常自動で付与される
-- service_roleへの権限も付いていなかった。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

grant usage on schema public to service_role;

grant all on public.profiles to service_role;
grant all on public.daily_completions to service_role;
grant all on public.follows to service_role;

-- 今後この schema に新しいテーブル（段階4のpostsなど）を作った際、
-- 同じ抜け漏れが起きないよう、service_roleへのGRANTだけは
-- デフォルトで付くようにしておく（anon/authenticatedは表ごとに
-- 見せてよい範囲が異なるため、これまで通り都度明示的にGRANTする）。
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
