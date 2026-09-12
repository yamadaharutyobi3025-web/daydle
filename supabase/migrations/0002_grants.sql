-- Social v1 段階1 追加分: テーブルレベルのGRANT
--
-- RLSポリシーは0001で設定済みだが、Postgresではその手前に
-- テーブルレベルの権限(GRANT)も必要（RLSは「許可された操作の中で
-- どの行が見えるか」を絞るだけで、操作自体を許可するのはGRANT）。
-- 通常はSupabaseがテーブル作成時に自動付与するが、今回このプロジェクトでは
-- 付与されなかったため、明示的にGRANTする。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行する。

grant usage on schema public to anon, authenticated;

-- profiles: anonもauthenticatedも読める。書き込みはauthenticatedのみ
-- （実際に更新できる行はRLSでauth.uid() = idに絞られる）。
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- daily_completions: 追記オンリー。ログインユーザーのみ
-- （実際に見える/書ける行はRLSでauth.uid() = user_idに絞られる）。
grant select, insert on public.daily_completions to authenticated;
