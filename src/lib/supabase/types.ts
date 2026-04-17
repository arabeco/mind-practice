/**
 * Supabase DB type definitions.
 * Keep in sync with supabase/schema.sql.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;           // UUID from auth.users
          nickname: string;
          avatar_variant: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_variant?: number;
        };
        Update: {
          nickname?: string;
          avatar_variant?: number;
        };
      };
      game_state: {
        Row: {
          user_id: string;      // FK → profiles.id
          state_json: Record<string, unknown>;  // jsonb
          updated_at: string;
        };
        Insert: {
          user_id: string;
          state_json: Record<string, unknown>;
        };
        Update: {
          state_json?: Record<string, unknown>;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
