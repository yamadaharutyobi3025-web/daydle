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
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          status: "pending" | "accepted";
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followee_id: string;
        };
        Update: {
          status?: "pending" | "accepted";
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          mission_text: string;
          duration_minutes: number;
          phone_mode: "offline" | "tool" | "connect";
          allowed_tools: string[];
          note: string | null;
          /** 投稿時点で書く、投稿専用の短い感想（「やってみて、どうだった？」）。 */
          comment: string | null;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_text: string;
          duration_minutes: number;
          phone_mode: "offline" | "tool" | "connect";
          allowed_tools?: string[];
          note?: string | null;
          comment?: string | null;
          photo_path?: string | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "posts_user_id_profiles_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_view_follow_lists: {
        Args: { target: string };
        Returns: boolean;
      };
      get_follow_counts: {
        Args: { target: string };
        Returns: { followers_count: number; following_count: number }[];
      };
      get_followers: {
        Args: { target: string };
        Returns: FollowListItem[];
      };
      get_following: {
        Args: { target: string };
        Returns: FollowListItem[];
      };
    };
  };
};

export type FollowListItem = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type PostWithProfile = Database["public"]["Tables"]["posts"]["Row"] & {
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};
