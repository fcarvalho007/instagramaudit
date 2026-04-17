export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analysis_snapshots: {
        Row: {
          analysis_status: string
          cache_key: string
          competitor_usernames: Json
          created_at: string
          expires_at: string
          id: string
          instagram_username: string
          normalized_payload: Json
          provider: string
          updated_at: string
        }
        Insert: {
          analysis_status?: string
          cache_key: string
          competitor_usernames?: Json
          created_at?: string
          expires_at: string
          id?: string
          instagram_username: string
          normalized_payload: Json
          provider?: string
          updated_at?: string
        }
        Update: {
          analysis_status?: string
          cache_key?: string
          competitor_usernames?: Json
          created_at?: string
          expires_at?: string
          id?: string
          instagram_username?: string
          normalized_payload?: Json
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      benchmark_references: {
        Row: {
          created_at: string
          dataset_version: string
          engagement_pct: number
          format: string
          id: string
          is_active: boolean
          tier: string
          tier_label: string
          tier_max_followers: number | null
          tier_min_followers: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dataset_version: string
          engagement_pct: number
          format: string
          id?: string
          is_active?: boolean
          tier: string
          tier_label: string
          tier_max_followers?: number | null
          tier_min_followers: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dataset_version?: string
          engagement_pct?: number
          format?: string
          id?: string
          is_active?: boolean
          tier?: string
          tier_label?: string
          tier_max_followers?: number | null
          tier_min_followers?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          email_normalized: string
          id: string
          name: string
          source: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          email_normalized: string
          id?: string
          name: string
          source?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          email_normalized?: string
          id?: string
          name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_requests: {
        Row: {
          analysis_snapshot_id: string | null
          competitor_usernames: Json
          created_at: string
          delivery_status: string
          id: string
          instagram_username: string
          is_free_request: boolean
          lead_id: string
          metadata: Json
          pdf_error_message: string | null
          pdf_generated_at: string | null
          pdf_status: string
          pdf_storage_path: string | null
          request_month: string
          request_source: string
          request_status: string
          updated_at: string
        }
        Insert: {
          analysis_snapshot_id?: string | null
          competitor_usernames?: Json
          created_at?: string
          delivery_status?: string
          id?: string
          instagram_username: string
          is_free_request?: boolean
          lead_id: string
          metadata?: Json
          pdf_error_message?: string | null
          pdf_generated_at?: string | null
          pdf_status?: string
          pdf_storage_path?: string | null
          request_month?: string
          request_source?: string
          request_status?: string
          updated_at?: string
        }
        Update: {
          analysis_snapshot_id?: string | null
          competitor_usernames?: Json
          created_at?: string
          delivery_status?: string
          id?: string
          instagram_username?: string
          is_free_request?: boolean
          lead_id?: string
          metadata?: Json
          pdf_error_message?: string | null
          pdf_generated_at?: string | null
          pdf_status?: string
          pdf_storage_path?: string | null
          request_month?: string
          request_source?: string
          request_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_requests_analysis_snapshot_id_fkey"
            columns: ["analysis_snapshot_id"]
            isOneToOne: false
            referencedRelation: "analysis_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
