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

1. **Auth基盤**（完了） — Supabase Auth、profiles、daily_completions同期
2. **プロフィール編集**（完了） — username/display_name/avatar/bio/is_private
3. **フォロー / フォロワー**（完了） — 公開即フォロー、非公開はリクエスト制
4. **投稿**（完了） — 完了記録から選んで明示的に投稿、写真は署名付きURLで表示、
   「みんな」画面にフォロー中/みんなタブを追加（既存の静的な例はそのまま残す）

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

### follows（段階3で作成済み）

```sql
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
```

- `status`はクライアントの指定を信用しない。`BEFORE INSERT`トリガー
  （`follows_set_status()`）が、その時点の相手の`profiles.is_private`を見て
  `pending`/`accepted`を強制的に決める（非公開アカウントへ`accepted`を
  直接送りつける申請バイパスを防ぐ）。
- `pending` → `accepted`への更新は`followee_id = auth.uid()`の本人のみ可能
  （RLSの`using`/`with check`でこの遷移だけを許可）。
- **段階1時点の「フォロー数は競争要素になるため非表示」という方針は撤回。**
  ユーザーからの明示的な指示により、フォロー中/フォロワーの人数を常に表示し、
  タップで一覧を見られるようにした。いいね数・XPのような競争演出（ランキング等）
  は引き続き作らない。
- 一覧・件数は素のテーブルRLSでは提供せず、`SECURITY DEFINER`関数
  （`get_follow_counts` / `get_followers` / `get_following` /
  `can_view_follow_lists`）経由でのみ提供する。理由: 「フォロー中一覧」と
  「フォロワー一覧」のどちらを見ているかで、どちらのアカウントの公開設定を
  見るべきかが変わり、行単位のRLS条件だけでは非公開アカウントの関係が
  漏れる組み合わせを作れてしまうため。関数側で「対象アカウント(target)が
  公開、または閲覧者が対象本人、または閲覧者が対象の承認済みフォロワー」を
  判定してから返す。件数はこの判定に関わらず常に返す（人数自体は公開/非公開
  の判断材料であり、隠す実益がないため）。
- 素の`follows`テーブルのRLSのselectは、本人が関わる行（follower or
  followee）のみ（自分の「フォロー中/フォロワー/自分宛の申請」の状態確認用）。

### posts（段階4で作成済み）

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_text text not null,
  duration_minutes integer not null,
  phone_mode text not null check (phone_mode in ('offline', 'tool', 'connect')),
  allowed_tools text[] not null default '{}',
  note text,
  photo_path text, -- 例: "{user_id}/{post_id}.jpg"（バケット内パス。URLではない）
  created_at timestamptz not null default now(),
  constraint posts_user_id_profiles_fkey foreign key (user_id) references public.profiles (id) on delete cascade
);
```

Context情報・座標・いいね数・XPに相当する列は一切持たない。`mission_text`
（`mission.description`）/`duration_minutes`/`phone_mode`/`allowed_tools`は
missionIdの参照ではなく、投稿時点で見えていた表示内容のスナップショット
（ミッション自体が将来変わっても投稿は変わらないようにするため）。
`user_id`にはauth.usersに加えてprofiles(id)への外部キーも付け、
PostgRESTで`posts.select("*, profiles(...)")`のように直接埋め込めるように
した（profiles.idは常にauth.users.idと一致するため矛盾しない）。

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

### Storage: `post-photos`（private bucket、段階4で作成済み）

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
