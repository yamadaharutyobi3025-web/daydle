# DAYDLE（デイドル）

> ちゃんと、時間を無駄にしよう。
> 最短距離ばかりの人生に、ちょっとだけ遠回りを。

DAYDLEは、1日1つだけ「今日の遠回り」を届けるスマートフォン向けWebサービスです。

生産性や効率化のためのアプリではありません。むしろ逆に、AIやテクノロジーで便利になった時間の中に、あえて「遠回り」「寄り道」「役に立たないこと」を差し込むためのサービスです。

- デジタルデトックスアプリではない
- 習慣化・自己啓発アプリではない
- SNSではない
- ToDoアプリでもない

DAYDLEが渡すのは目標や成果ではなく、「今日、ちょっと面白かったな」と思える小さなきっかけです。

このREADMEは、プログラミング初心者の個人開発者がひとりでメンテナンスできることを前提に書いています。

---

## 1. 技術構成

- **Next.js 16**（App Router / Turbopack）
- **TypeScript**
- **Tailwind CSS v4**（CSSファイル内で色・フォントを定義する方式）
- 状態管理ライブラリなし（React標準の `useState` / `useSyncExternalStore` のみ）
- データ保存は **localStorage**（MVPではサーバーもDBも使いません）
- ホスティングは **Vercel** を想定

外部サービスやAPIキーは一切不要です。`npm install` して `npm run dev` すれば、誰の環境でもそのまま動きます（`feature/social-v1` ブランチのSocial機能はオプトインで、設定しなくても本体は動きます。詳細は「12. Social v1」参照）。

---

## 2. インストールと起動方法

Node.js（20.9以降が必須。Next.js 16の要件です）がインストールされていることを確認したうえで、このフォルダで以下を実行してください。

```bash
npm install
npm run dev
```

ターミナルに表示されるURL（通常は `http://localhost:3000`）をブラウザで開くと、DAYDLEが表示されます。

### 本番用ビルドの確認

公開前には、エラーなくビルドできるかを必ず確認してください。

```bash
npm run build
```

エラーが出なければ、そのままVercelなどにデプロイできる状態です。ローカルで本番相当の動作を見たい場合は、ビルド後に以下を実行します。

```bash
npm run start
```

### コードチェック（Lint）

```bash
npm run lint
```

---

## 3. 主要ファイルの役割

```
app/
  page.tsx            … "/" ルート。今日の状態に応じてWelcome画面 or 今日の遠回り画面を出し分ける
  start/page.tsx       … 「やる」を押した後のミッション開始画面（PHONE MODEごとの案内）
  card/page.tsx         … CARD MODE（スクリーンショット用のポスター画面）
  community/page.tsx    … 「みんな」画面（サンプルデータ + 終了画面）
  record/page.tsx       … 「記録」画面（昨日の振り返り + 過去の遠回り一覧）
  layout.tsx            … 全体のレイアウト、フォント、メタデータ
  globals.css           … 色・フォントなどのデザイントークン（Tailwind v4のテーマ定義）
  manifest.ts           … PWA用マニフェスト
  icon.tsx / apple-icon.tsx / icon-192, icon-512 … アプリアイコン（コードで自動生成）

components/
  WelcomeFlow.tsx        … Welcome画面のロジック（時間・気分を選んでミッションを受け取る）
  TodayScreen.tsx         … 今日の遠回り画面のロジック（やる/やらない/別の遠回りを見る）
  MissionPoster.tsx       … ミッションを大きく表示する共通パーツ（ポスターのような見た目）
  PhoneModeBadge.tsx       … OFFLINE / TOOL / CONNECT のバッジ表示
  BottomNav.tsx / AppChrome.tsx … 下部ナビゲーションの表示制御
  Logo.tsx / CurvedPath.tsx      … DAYDLEロゴと、ブランドモチーフの曲線

data/
  missions.ts            … 「今日の遠回り」ミッション本体（60件以上）
  community.ts            … 「みんな」に表示するサンプルデータ

types/
  mission.ts              … Mission / CommunityMission の型定義

lib/
  missionSelector.ts        … 時間・気分に応じてミッションを選ぶロジック
  community.ts                … 「みんな」を日替わりで5件選ぶロジック
  storage.ts                   … localStorageの読み書き（今日のミッション・履歴）
  date.ts                       … 日付まわりのユーティリティ
  track.ts                       … イベント計測の抽象化（今はconsole.logのみ）
  useClientSnapshot.ts            … localStorageの値を安全にReactへ反映するための小さなフック
```

---

## 4. ミッションを追加・編集する方法

ミッションはすべて `data/missions.ts` の配列に入っています。新しいミッションを増やしたいときは、この配列の最後に次の形でオブジェクトを1つ追加するだけです。

```ts
{
  id: "walk_009",                 // 他と被らない好きなID
  title: "知らない角を曲がる",       // 内部用の短いタイトル
  description: "帰り道、いつも曲がらない角を一回だけ曲がってください。", // 画面に表示される本文
  duration: 15,                    // 目安の分数（5 / 10 / 15 / 20 / 30 / 45 / 60など）
  environment: "outside",          // "outside" | "inside" | "either"
  moods: ["quiet", "adventure"],   // Welcome画面の気分の選択肢と対応
  phoneMode: "offline",            // "offline" | "tool" | "connect"
  allowedTools: [],                // toolのときだけ ["camera"] や ["maps"] を指定
  costLevel: 0,                    // 0 = 無料 / 1 = 少額 / 2 = やや出費あり
  category: "walk",                // walk / nature / quiet / food / book / home / people / adventure / nostalgia / pointless
  safetyNote: null,                // 注意書きが必要な場合だけ文字列を入れる
},
```

保存するだけで、次回のミッション抽選から自動的に候補に含まれます。コードの他の部分を触る必要はありません。

「みんな」のサンプルを増やしたい場合は、同じ要領で `data/community.ts` に追加してください。

---

## 5. 文章（コピー）を変更する方法

画面ごとの文章は、それぞれのファイルの中に直接書かれています（Reactの中にJSXとして書く方式です）。主な場所は以下の通りです。

- Welcome画面の見出し・説明文 → `components/WelcomeFlow.tsx`
- ミッション開始画面（OFFLINE/TOOL/CONNECTの案内文）→ `app/start/page.tsx` の `copy` オブジェクト
- 「みんな」の見出しや終了メッセージ → `app/community/page.tsx`
- 「記録」の振り返り質問・選択肢 → `app/record/page.tsx`

日本語の文章をそのまま書き換えて保存すれば、画面にすぐ反映されます。

---

## 6. 色を変更する方法

色はすべて `app/globals.css` の先頭、`:root` の中にまとめてあります。

```css
:root {
  --color-cream: #f7f2e8;       /* 背景（生成り） */
  --color-cream-deep: #eee4d2;   /* 選択中チップの背景など、生成りより少し濃い面 */
  --color-ink: #36322b;           /* 本文の文字色（柔らかいチャコール） */
  --color-ink-soft: #6b6459;      /* 補足テキストの色 */
  --color-sage: #85987a;          /* アクセント（セージグリーン） */
  --color-sage-deep: #5f7756;     /* ボタン・タグなど濃いめのアクセント */
  --color-sage-soft: #e7ebdd;     /* 選択中チップの背景など */
  --color-line: #e7ddc9;          /* 罫線・境界線 */
  --color-paper: #fffdf7;         /* カードなど、生成りより少し明るい紙面 */
}
```

ここの16進数カラーコードを書き換えるだけで、アプリ全体の配色が変わります（`bg-sage-deep` や `text-ink-soft` のようなクラス名は変更不要です）。

---

## 7. 公開前チェック（本番ビルド・環境変数・PWA）

Vercelへ出す前に、このフォルダで以下を実行し、どちらもエラーが出ないことを確認してください。

```bash
npm run lint
npm run build
```

### 環境変数について

**環境変数は1つも必要ありません。** DAYDLEはAPIキーや外部サービスの認証情報を一切使っておらず、データはすべてブラウザのlocalStorageに保存されます。Vercelの「Environment Variables」欄は空のままで大丈夫です。

### 開発用の設定が本番に影響しないことについて

`next.config.ts` の `allowedDevOrigins` と `devIndicators: false` は、どちらも**開発中（`npm run dev`実行時）だけ**意味を持つ設定です。`npm run build` で作られる本番ビルドにはこれらの機能自体が含まれず、Vercel上の公開URLでは最初から「N」アイコンも開発用の警告も表示されません（そのため公開前に特別な作業は不要です）。

### PWA（アイコン・マニフェスト）について

タイトル・説明文・アイコンは以下で生成されており、公開時に自動で反映されます。

- タイトル／説明文：`app/layout.tsx` の `metadata`
- ホーム画面追加時の見た目：`app/manifest.ts`
- favicon・アプリアイコン：`app/icon.tsx`（32×32）／`app/apple-icon.tsx`（180×180）／`app/icon-192`・`app/icon-512`（PWA用）

これらはコードから自動生成される画像なので、画像ファイルを用意する必要はありません。文言だけ変えたい場合は `app/layout.tsx` と `app/manifest.ts` の中の文字列を書き換えてください。

---

## 8. Vercelへの公開方法（初めての人向け・手順ひとつずつ）

### 8-1. GitHubにコードを置く

1. [GitHub](https://github.com) にログインし、右上の「+」→「New repository」で新しいリポジトリを作成します（例: `daydle`）。「Add a README」などのチェックは外したままで構いません。
2. このフォルダ（`daydle`）で、まだ一度もコミットしていない変更をコミットします。

   ```bash
   git add -A
   git commit -m "Prepare DAYDLE for Vercel deploy"
   ```

3. 作成したGitHubリポジトリのURLをリモートとして登録し、pushします（`<あなたのURL>`は手順1で作成したリポジトリのURLに置き換えてください）。

   ```bash
   git remote add origin <あなたのURL>
   git branch -M main
   git push -u origin main
   ```

### 8-2. Vercelでプロジェクトを作成する

4. [Vercel](https://vercel.com) にアクセスし、「Continue with GitHub」でGitHubアカウントでログインします。
5. ダッシュボードの「Add New...」→「Project」を選びます。
6. 「Import Git Repository」の一覧から、先ほどpushした `daydle` リポジトリを探して「Import」を押します。
7. 「Configure Project」画面が出ます。Framework Presetには自動で **Next.js** が選ばれているはずです。特に設定を変える必要はありません（Build Command・Output Directory・Install Commandはすべて空欄／デフォルトのままでOKです）。
8. 「Environment Variables」欄は何も入力せず、そのままで構いません（7章参照）。
9. 「Deploy」ボタンを押します。

### 8-3. 公開されたことを確認する

10. 1〜2分ほど待つと、ビルドが完了し「Congratulations!」の画面と、`https://daydle-（何かの文字列）.vercel.app` のようなURLが表示されます。
11. そのURLをクリックして、実際にDAYDLEが表示されることを確認します。

以降は、`git push` するたびにVercelが自動でビルド・再デプロイしてくれます（このリポジトリを更新する限り、Vercel側での追加作業は不要です）。

---

## 9. 公開後の確認チェックリスト（第三者に送る前に）

発行された本番URL（`https://xxxx.vercel.app`）を、できれば**実機のiPhone Safari**で開いて、以下をひとつずつ確認してください。すべて済んだら、他の人に送って試してもらって大丈夫です。

### 画面が正しく表示されるか

- [ ] URLを開くと、DAYDLEのロゴとWelcome画面（時間・気分の選択）が表示される
- [ ] ホーム画面に追加した際に、DAYDLEのアイコン・名前が正しく表示される（Safariの共有ボタン→「ホーム画面に追加」）

### 一連の操作が最後まで動くか

- [ ] 時間・気分を選んで「今日の遠回りをもらう」→ ミッションが表示される
- [ ] 「やる」→ ミッション開始画面（OFFLINE/TOOL/CONNECTの案内文）が表示される
- [ ] 「今日はやらない」を押すと、静かなメッセージに切り替わる
- [ ] 「別の遠回りを見る」で別の候補に切り替わる（最大3候補まで、無限には引けない）
- [ ] 「カードで見る」でCARD MODE（ナビゲーションなしのポスター表示）になる
- [ ] タブを閉じて再度開いても、同じ日のうちは同じミッションのままである
- [ ] 「みんな」を開くと5件のサンプルと終了画面が表示される
- [ ] 「みんな」の「私もやってみる」を押すと、今日の遠回りがそのミッションに差し替わり、「今日」画面に戻る
- [ ] 下部ナビ「今日 / みんな / 記録」がどの画面からでも押せる
- [ ] 「記録」を開くと（翌日以降は）「昨日の遠回り、どうでしたか？」の質問が出て、回答すると履歴に反映される

### 何度か送っても壊れないか

- [ ] 一度ブラウザのlocalStorageをクリアした状態（プライベートブラウズなど）で開いても、初回ユーザーとして正常にWelcome画面から始まる
- [ ] iPhoneとMacの両方のブラウザで、上記が同じように動く

---

## 10. 将来的な拡張について（MVPでは未実装）

DAYDLEはまず「本当に使いたい人がいるか」を検証するためのMVPです。以下は現時点では実装していませんが、後から追加しやすいように設計してあります。

### イベント計測（PostHogなど）を追加する場合

`lib/track.ts` の `trackEvent` 関数の中身を、PostHogなど計測サービスのSDK呼び出しに差し替えるだけで済みます。呼び出し側（各画面のコード）は変更不要です。

```ts
// 例: PostHogに差し替える場合
export function trackEvent(name: TrackEventName, props?: Record<string, unknown>) {
  posthog.capture(name, props);
}
```

### Supabase（ログイン・フォロー・投稿）について

`feature/social-v1` ブランチで実装中です。詳しくは次節「12. Social v1」と
`docs/social-v1-design.md` を参照してください。ミッション本体
（`data/missions.ts` / `lib/storage.ts`）は置き換えず、その上に完全オプトインの
ソーシャル機能を追加する設計です。

### AIによるミッション生成・パーソナライズを追加する場合

`lib/missionSelector.ts` の `selectDailyCandidates` 関数が、現在は静的データからの絞り込みだけを行っています。将来AI（LLM API）でミッションを生成・パーソナライズしたい場合は、この関数の中身をAPI呼び出しに差し替える形になります。時間・気分などの入力（`SelectionInput`）はそのまま流用できます。

---

## 11. ライセンス・注意事項

DAYDLEのミッションは、交通ルール違反・危険な場所への立ち入り・高額な支出などにつながらないよう配慮して作成しています。ミッションを追加する際も、この安全性の方針を踏襲してください。

---

## 12. Social v1（ログイン・フォロー・投稿、完全オプトイン）を試す

`feature/social-v1` ブランチのみ。**設定しなくてもDAYDLE本体（今日/みんな/記録など）は今まで通り動きます。**未設定の間は `/login` にアクセスしても「Social機能はまだ準備中です」と表示されるだけです。

現時点（段階1: Auth基盤）で試せるのは、ログイン（メールのマジックリンク）とアカウント画面だけです。プロフィール編集・フォロー・投稿はまだ実装していません。設計全体は `docs/social-v1-design.md` を参照してください。

1. [supabase.com](https://supabase.com) でプロジェクトを作成する
2. Supabaseダッシュボード → SQL Editor で `supabase/migrations/0001_auth_foundation.sql` の中身を実行する
3. Project Settings → API Keys から `Project URL` と `Publishable key`（`sb_publishable_...`）を確認する
4. このフォルダに `.env.local` を作り、`.env.local.example` を参考に値を埋める
5. `npm run dev` を再起動し、`/login` からメールアドレスでログインを試す

`.env.local` はGit管理しません（`.gitignore`で除外済み）。
