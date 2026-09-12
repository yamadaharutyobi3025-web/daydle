/**
 * Supabase DBの型定義（手書き）。
 * スキーマを変更したら supabase/migrations/ と一緒にここも更新すること。
 * 将来 `supabase gen types typescript` に置き換えてもよい。
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_private?: boolean;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_private?: boolean;
        };
        Relationships: [];
      };
      daily_completions: {
        Row: {
          user_id: string;
          date: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
        };
        Update: {
          user_id?: string;
          date?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
