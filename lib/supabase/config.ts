/**
 * Supabaseの環境変数が設定されているか。
 * Social機能は完全オプトインであり、Supabaseプロジェクトを未設定のままでも
 * 既存のアプリ（今日/みんな/記録など）は今まで通り動く必要がある。
 * proxy.tsやSocialSyncはこれを見て、未設定なら何もせずスキップする。
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
