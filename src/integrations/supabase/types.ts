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
      analysis_events: {
        Row: {
          analysis_snapshot_id: string | null
          billing_event_id: string | null
          cache_key: string | null
          competitor_handles: Json
          created_at: string
          data_source: string
          duration_ms: number | null
          error_code: string | null
          estimated_cost_usd: number | null
          handle: string
          id: string
          network: string
          outcome: string
          posts_returned: number | null
          profiles_returned: number | null
          provider_call_log_id: string | null
          request_ip_hash: string | null
          user_agent_family: string | null
        }
        Insert: {
          analysis_snapshot_id?: string | null
          billing_event_id?: string | null
          cache_key?: string | null
          competitor_handles?: Json
          created_at?: string
          data_source: string
          duration_ms?: number | null
          error_code?: string | null
          estimated_cost_usd?: number | null
          handle: string
          id?: string
          network: string
          outcome: string
          posts_returned?: number | null
          profiles_returned?: number | null
          provider_call_log_id?: string | null
          request_ip_hash?: string | null
          user_agent_family?: string | null
        }
        Update: {
          analysis_snapshot_id?: string | null
          billing_event_id?: string | null
          cache_key?: string | null
          competitor_handles?: Json
          created_at?: string
          data_source?: string
          duration_ms?: number | null
          error_code?: string | null
          estimated_cost_usd?: number | null
          handle?: string
          id?: string
          network?: string
          outcome?: string
          posts_returned?: number | null
          profiles_returned?: number | null
          provider_call_log_id?: string | null
          request_ip_hash?: string | null
          user_agent_family?: string | null
        }
        Relationships: []
      }
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
      provider_call_logs: {
        Row: {
          actor: string
          actual_cost_usd: number | null
          analysis_event_id: string | null
          apify_run_id: string | null
          created_at: string
          duration_ms: number | null
          error_excerpt: string | null
          estimated_cost_usd: number | null
          handle: string
          http_status: number | null
          id: string
          network: string
          posts_returned: number
          provider: string
          status: string
        }
        Insert: {
          actor: string
          actual_cost_usd?: number | null
          analysis_event_id?: string | null
          apify_run_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          handle: string
          http_status?: number | null
          id?: string
          network: string
          posts_returned?: number
          provider?: string
          status: string
        }
        Update: {
          actor?: string
          actual_cost_usd?: number | null
          analysis_event_id?: string | null
          apify_run_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          handle?: string
          http_status?: number | null
          id?: string
          network?: string
          posts_returned?: number
          provider?: string
          status?: string
        }
        Relationships: []
      }
      report_requests: {
        Row: {
          analysis_snapshot_id: string | null
          competitor_usernames: Json
          created_at: string
          delivery_status: string
          email_error_message: string | null
          email_message_id: string | null
          email_sent_at: string | null
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
          email_error_message?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
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
          email_error_message?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
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
      social_profiles: {
        Row: {
          analyses_blocked: number
          analyses_cache: number
          analyses_failed: number
          analyses_fresh: number
          analyses_stale: number
          analyses_total: number
          created_at: string
          display_name: string | null
          estimated_cost_usd_total: number
          first_analyzed_at: string
          followers_last_seen: number | null
          handle: string
          last_analyzed_at: string
          last_data_source: string | null
          last_outcome: string | null
          last_snapshot_id: string | null
          network: string
          updated_at: string
        }
        Insert: {
          analyses_blocked?: number
          analyses_cache?: number
          analyses_failed?: number
          analyses_fresh?: number
          analyses_stale?: number
          analyses_total?: number
          created_at?: string
          display_name?: string | null
          estimated_cost_usd_total?: number
          first_analyzed_at?: string
          followers_last_seen?: number | null
          handle: string
          last_analyzed_at?: string
          last_data_source?: string | null
          last_outcome?: string | null
          last_snapshot_id?: string | null
          network: string
          updated_at?: string
        }
        Update: {
          analyses_blocked?: number
          analyses_cache?: number
          analyses_failed?: number
          analyses_fresh?: number
          analyses_stale?: number
          analyses_total?: number
          created_at?: string
          display_name?: string | null
          estimated_cost_usd_total?: number
          first_analyzed_at?: string
          followers_last_seen?: number | null
          handle?: string
          last_analyzed_at?: string
          last_data_source?: string | null
          last_outcome?: string | null
          last_snapshot_id?: string | null
          network?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          handle: string | null
          id: string
          kind: string
          metric_name: string
          metric_value: number
          network: string | null
          notes: string | null
          request_ip_hash: string | null
          severity: string
          threshold_value: number
          window_end: string
          window_start: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          kind: string
          metric_name: string
          metric_value: number
          network?: string | null
          notes?: string | null
          request_ip_hash?: string | null
          severity: string
          threshold_value: number
          window_end: string
          window_start: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          kind?: string
          metric_name?: string
          metric_value?: number
          network?: string | null
          notes?: string | null
          request_ip_hash?: string | null
          severity?: string
          threshold_value?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_analysis_event: {
        Args: {
          p_analysis_snapshot_id: string
          p_cache_key: string
          p_competitor_handles: Json
          p_data_source: string
          p_display_name?: string
          p_duration_ms: number
          p_error_code: string
          p_estimated_cost_usd: number
          p_followers_last_seen?: number
          p_handle: string
          p_network: string
          p_outcome: string
          p_posts_returned: number
          p_profiles_returned: number
          p_provider_call_log_id: string
          p_request_ip_hash: string
          p_user_agent_family: string
        }
        Returns: string
      }
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
