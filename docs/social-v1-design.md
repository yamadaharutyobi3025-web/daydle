# Social v1 設計

DAYDLEに「完全オプトインの緩やかなソーシャル」を追加する。
Supabase Auth + Postgres(RLS) + Storageを使う。

## 方針（変更しないこと）

- Socialは完全オプトイン。使わなくてもアプリは今まで通り動く。
- Context情報（場所・予定・同席者）は一切投稿しない。
- 緯度経度は保存しない。
- XP・レベル・ランキング・いいね数などの競争要素は作らない。
- 既存のタイマー・写真・記録・共有カード・PWAは壊さない。
- 「投稿する」は完了記録（history）とは別の、明示的なユーザー操作。
- 30/60分解放ロジック（lib/unlocks.ts）には触らない。
- 1日1遠回りは、未ログイン→ログインという経路でも必ず守る。

## 段階

1. **Auth基盤**（実装中） — Supabase Auth、profiles、daily_completions同期
2. プロフィール編集（username/display_name/avatar/bio/is_private）
3. フォロー / フォロワー（公開即フォロー、非公開はリクエスト制）
4. 投稿（完了記録から選んで明示的に投稿、写真は署名付きURLで表示）
5. 「みんな」画面のSupabase版（フォロー中のタイムライン）

## スキーマ

### profiles（段階1で作成済み）

他ユーザーも読めるプロフィール。認証情報(email等)は一切含めない。

| column | type | 備考 |
| --- | --- | --- |
| id | uuid PK | auth.users.id と同じ |
| username | text unique | 表示用ID。サインアップ時トリガーが仮の値を自動発行 |
| display_name | text? | |
| avatar_url | text? | |
| bio | text? | |
| is_private | boolean | デフォルト`true`（非公開）。ユーザーが明示的に公開へ切り替える |
| created_at / updated_at | timestamptz | |

RLS: `select`は`anon, authenticated`両方に許可（`using (true)`）。
`update`/`insert`は本人のみ。

username/display_name/avatar_url/bio/is_privateはいずれも非秘匿情報として
扱う。**is_privateを非公開にする理由は「他人に見せたくないから」ではなく、
「フォローに承認を挟みたいから」であり、is_private自体を隠す実益はない。**
プロフィール画面はこれを見て「フォロー」(公開)か「フォローをリクエスト」
(非公開)かを出し分ける。

### daily_completions（段階1で作成済み）

「1日1遠回り」をサーバー側でも保証するための記録。

| column | type |
| --- | --- |
| user_id | uuid, references auth.users |
| date | date |
| created_at | timestamptz |

PK: `(user_id, date)`。RLSは本人のselect/insertのみ（update/deleteなし、
追記オンリー）。

**同期フロー（lib/socialSync.ts）**: ログイン直後（`onAuthStateChange`の
`SIGNED_IN`）に、`lib/storage.ts`の`hasCompletedToday()`がtrueなら
今日の日付を`upsert`する。新しいmissionを開始してよいかどうかは

```
ローカルの hasCompletedToday() OR サーバーの daily_completions に今日の行がある
```

のORで判定する（いずれか一方だけを見ない）。これにより
「未ログインで1回完了 → ログインしてフォロー中/みんなから2回目」を防ぐ。

### follows（段階3で作成予定）

```sql
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
```

- follow実行時、相手の`profiles.is_private`を見てアプリ側が`status`を決める
  （公開なら`accepted`、非公開なら`pending`）。
- `pending`→ `accepted`への更新は`followee_id = auth.uid()`の本人のみ可能。
- フォロー数・フォロワー数は集計してUIに出さない（競争要素を作らない方針）。
- RLSのselectは本人が関わる行（follower or followee）のみ。一覧性のある
  「誰が誰をフォローしているか」を第三者に見せる用途は今のところ作らない。

### posts（段階4で作成予定）

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_text text not null,
  note text,
  photo_path text, -- 例: "{user_id}/{post_id}.jpg"（バケット内パス。URLではない）
  created_at timestamptz not null default now()
);
```

Context情報・座標・いいね数・XPに相当する列は一切持たない。

RLS select（可視性）:

```sql
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
)
```

insert/deleteは本人のみ。updateは不可（記録の改変はしない。消すのは可）。

### Storage: `post-photos`（private bucket、段階4で作成予定）

- バケットは常に**private**（`public: false`）。公開アカウント/非公開
  アカウントを問わず、これは変えない。
- 保存パスは常に`{user_id}/{post_id}.jpg`。DBにはこの`photo_path`だけを
  保存し、**恒久URL・署名付きURLはDBに保存しない**。
- 表示時のみ、その場でsigned URLを発行する:
  1. サーバー側（Route Handler）で、リクエストユーザーのセッションを使い
     `posts`テーブルを`select`する（上のRLSがそのまま可視性チェックになる）。
  2. 行が返ってくれば閲覧可能と確定。service roleクライアントで
     `storage.createSignedUrl(photo_path, 短い有効期限)`を発行して返す。
  3. 行が返ってこなければ403相当で終わる。signed URLは発行しない。
- storage.objectsのRLSはinsert/delete（自分の`{auth.uid()}/`配下のみ）だけ
  用意し、**select用のRLSは作らない**（誰にも直接読ませない。読み出しは
  必ず上記のservice role経由の署名URL発行を通す）。
- これにより、非公開→公開・公開→非公開を切り替えてもファイルの移動は
  不要（アクセス制御はposts RLS側にあり、ストレージの場所とは独立している）。

```sql
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
```

## 認証方式

Supabase Authのメールマジックリンク（パスワードレス、`signInWithOtp`）を
第一候補として段階1で実装する。パスワード管理・リセットフローが不要で、
実装量が一番小さいため。他方式（パスワード、Google OAuth等）を後から
追加してもこの設計とは独立に足せる。
