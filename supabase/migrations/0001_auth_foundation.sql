-- Social v1 段階1: Auth基盤
-- profiles（他ユーザーからも閲覧可能な公開プロフィール）と
-- daily_completions（「1日1遠回り」をサーバー側でも保証するための記録）。
--
-- 適用方法: Supabaseダッシュボードの SQL Editor に貼って実行するか、
-- `supabase db push` (要 supabase CLIでのプロジェクトリンク)。

-- ============================================================
-- profiles
-- ============================================================
-- email等Auth側の情報は一切含めない。ここに置く列は全て「他ユーザーに
-- 見えてよい」列だけにすること（RLSでselectを全員に許可しているため）。

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- username: 表示用の識別子。英数字・アンダースコア・ハイフンのみ、3〜20文字。
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_-]{3,20}$');

-- username, display_name, avatar_url, bio, is_private は全て非秘匿情報。
-- 「公開アカウント→フォロー / 非公開アカウント→フォローをリクエスト」の
-- 判断にis_privateを使うため、未ログインを含め誰でも読めるようにする。
create policy "profiles_select_all"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 通常はhandle_new_user()トリガーがinsertするが、
-- クライアントから直接insertするケース（トリガー未設定環境など）に備えて
-- 自分自身の行のみinsert可能にしておく。
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- auth.users -> profiles 自動作成
-- ============================================================
-- is_privateはデフォルトtrue（非公開）。公開するかどうかは
-- ユーザー自身がプロフィール画面で明示的に選ぶ（Social完全オプトインの方針）。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, is_private)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- daily_completions
-- ============================================================
-- 「1日1遠回り」をサーバー側でも保証するための記録。
-- 未ログインで完了 -> 後からログイン、という抜け道を防ぐため、
-- クライアントはログイン直後にlocalStorageのhasCompletedToday()を見て
-- trueならここへ今日の日付をupsertする（lib/socialSync.ts）。
-- 新しいmissionを開始してよいかどうかは、
-- 「ローカルのhasCompletedToday() OR ここに今日の行が存在する」のORで判定する。

create table if not exists public.daily_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_completions enable row level security;

create policy "daily_completions_select_own"
  on public.daily_completions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_completions_insert_own"
  on public.daily_completions for insert
  to authenticated
  with check (auth.uid() = user_id);
