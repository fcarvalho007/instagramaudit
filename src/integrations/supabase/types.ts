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
      apify_lab_runs: {
        Row: {
          actual_cost_usd: number | null
          admin_email: string | null
          apify_run_id: string | null
          created_at: string
          duration_ms: number | null
          error_excerpt: string | null
          estimated_cost_usd: number | null
          guardrails: Json
          id: string
          input_params: Json
          mode: string | null
          newest_post_at: string | null
          normalize_ok: boolean | null
          notes: string | null
          observed_days: number | null
          oldest_post_at: string | null
          only_posts_newer_than: string | null
          posts_extracted: number | null
          posts_returned: number | null
          profile_handle: string
          profile_metadata_present: boolean | null
          profile_segment: string | null
          purpose: string | null
          raw_items_returned: number | null
          results_limit: number | null
          results_type: string | null
          semantic_code: string | null
          status: string
          window_kind: string
        }
        Insert: {
          actual_cost_usd?: number | null
          admin_email?: string | null
          apify_run_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          guardrails?: Json
          id?: string
          input_params?: Json
          mode?: string | null
          newest_post_at?: string | null
          normalize_ok?: boolean | null
          notes?: string | null
          observed_days?: number | null
          oldest_post_at?: string | null
          only_posts_newer_than?: string | null
          posts_extracted?: number | null
          posts_returned?: number | null
          profile_handle: string
          profile_metadata_present?: boolean | null
          profile_segment?: string | null
          purpose?: string | null
          raw_items_returned?: number | null
          results_limit?: number | null
          results_type?: string | null
          semantic_code?: string | null
          status: string
          window_kind: string
        }
        Update: {
          actual_cost_usd?: number | null
          admin_email?: string | null
          apify_run_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          guardrails?: Json
          id?: string
          input_params?: Json
          mode?: string | null
          newest_post_at?: string | null
          normalize_ok?: boolean | null
          notes?: string | null
          observed_days?: number | null
          oldest_post_at?: string | null
          only_posts_newer_than?: string | null
          posts_extracted?: number | null
          posts_returned?: number | null
          profile_handle?: string
          profile_metadata_present?: boolean | null
          profile_segment?: string | null
          purpose?: string | null
          raw_items_returned?: number | null
          results_limit?: number | null
          results_type?: string | null
          semantic_code?: string | null
          status?: string
          window_kind?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
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
      beta_feedback: {
        Row: {
          clarity_text: string | null
          contact_consent: boolean
          created_at: string
          id: string
          lead_id: string
          missing_text: string | null
          pricing_preference: string | null
          purchase_intent: string
          report_request_id: string
          usefulness_score: number
          user_agent: string | null
        }
        Insert: {
          clarity_text?: string | null
          contact_consent?: boolean
          created_at?: string
          id?: string
          lead_id: string
          missing_text?: string | null
          pricing_preference?: string | null
          purchase_intent: string
          report_request_id: string
          usefulness_score: number
          user_agent?: string | null
        }
        Update: {
          clarity_text?: string | null
          contact_consent?: boolean
          created_at?: string
          id?: string
          lead_id?: string
          missing_text?: string | null
          pricing_preference?: string | null
          purchase_intent?: string
          report_request_id?: string
          usefulness_score?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      comment_enrichment_jobs: {
        Row: {
          analysis_event_id: string | null
          attempts: number
          completed_at: string | null
          created_at: string
          handle: string
          id: string
          last_error: string | null
          post_urls: Json
          snapshot_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analysis_event_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          handle: string
          id?: string
          last_error?: string | null
          post_urls?: Json
          snapshot_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_event_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          handle?: string
          id?: string
          last_error?: string | null
          post_urls?: Json
          snapshot_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_daily: {
        Row: {
          amount_usd: number
          call_count: number
          collected_at: string
          day: string
          details: Json | null
          id: string
          provider: string
        }
        Insert: {
          amount_usd?: number
          call_count?: number
          collected_at?: string
          day: string
          details?: Json | null
          id?: string
          provider: string
        }
        Update: {
          amount_usd?: number
          call_count?: number
          collected_at?: string
          day?: string
          details?: Json | null
          id?: string
          provider?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_code: string
          id: string
          lead_id: string | null
          payment_id: string | null
          product_code: string
          redeemed_at: string
        }
        Insert: {
          coupon_code: string
          id?: string
          lead_id?: string | null
          payment_id?: string | null
          product_code: string
          redeemed_at?: string
        }
        Update: {
          coupon_code?: string
          id?: string
          lead_id?: string | null
          payment_id?: string | null
          product_code?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_code_fkey"
            columns: ["coupon_code"]
            isOneToOne: false
            referencedRelation: "payment_coupons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "coupon_redemptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "lead_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          analysis_snapshot_id: string | null
          cache_key: string | null
          created_at: string
          delta: number
          handle: string | null
          id: string
          lead_id: string
          metadata: Json
          reason: string
          reservation_id: string | null
        }
        Insert: {
          analysis_snapshot_id?: string | null
          cache_key?: string | null
          created_at?: string
          delta: number
          handle?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          reason: string
          reservation_id?: string | null
        }
        Update: {
          analysis_snapshot_id?: string | null
          cache_key?: string | null
          created_at?: string
          delta?: number
          handle?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          reason?: string
          reservation_id?: string | null
        }
        Relationships: []
      }
      email_template_history: {
        Row: {
          action: string
          changed_at: string
          changed_by_email: string | null
          id: string
          snapshot: Json
          template_key: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by_email?: string | null
          id?: string
          snapshot: Json
          template_key: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by_email?: string | null
          id?: string
          snapshot?: Json
          template_key?: string
        }
        Relationships: []
      }
      email_template_overrides: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          headline: string | null
          preheader: string | null
          subject: string | null
          template_key: string
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          headline?: string | null
          preheader?: string | null
          subject?: string | null
          template_key: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          headline?: string | null
          preheader?: string | null
          subject?: string | null
          template_key?: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: []
      }
      enrichment_jobs: {
        Row: {
          analysis_event_id: string | null
          attempts: number
          completed_at: string | null
          created_at: string
          enrichment_type: string
          error_message: string | null
          handle: string
          id: string
          input_hash: string | null
          max_attempts: number
          priority: number
          snapshot_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analysis_event_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          enrichment_type: string
          error_message?: string | null
          handle: string
          id?: string
          input_hash?: string | null
          max_attempts?: number
          priority?: number
          snapshot_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_event_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          enrichment_type?: string
          error_message?: string | null
          handle?: string
          id?: string
          input_hash?: string | null
          max_attempts?: number
          priority?: number
          snapshot_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inline_report_feedback: {
        Row: {
          block: string
          comment: string | null
          created_at: string
          handle: string
          id: string
          ip_hash: string | null
          rating: number
          snapshot_id: string | null
          user_agent: string | null
        }
        Insert: {
          block: string
          comment?: string | null
          created_at?: string
          handle: string
          id?: string
          ip_hash?: string | null
          rating: number
          snapshot_id?: string | null
          user_agent?: string | null
        }
        Update: {
          block?: string
          comment?: string | null
          created_at?: string
          handle?: string
          id?: string
          ip_hash?: string | null
          rating?: number
          snapshot_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      knowledge_benchmarks: {
        Row: {
          created_at: string
          created_by_email: string | null
          engagement_pct: number | null
          format: string
          id: string
          notes: string | null
          origin: string
          platform: string
          posts_per_month: number | null
          sample_size: number | null
          source_id: string | null
          tier: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by_email?: string | null
          engagement_pct?: number | null
          format: string
          id?: string
          notes?: string | null
          origin: string
          platform?: string
          posts_per_month?: number | null
          sample_size?: number | null
          source_id?: string | null
          tier: string
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by_email?: string | null
          engagement_pct?: number | null
          format?: string
          id?: string
          notes?: string | null
          origin?: string
          platform?: string
          posts_per_month?: number | null
          sample_size?: number | null
          source_id?: string | null
          tier?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_benchmarks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_history: {
        Row: {
          action: string
          changed_at: string
          changed_by_email: string | null
          diff: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by_email?: string | null
          diff?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by_email?: string | null
          diff?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      knowledge_notes: {
        Row: {
          archived: boolean
          body: string
          category: string
          created_at: string
          created_by_email: string | null
          id: string
          source_id: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          vertical: string | null
        }
        Insert: {
          archived?: boolean
          body: string
          category: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          source_id?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          vertical?: string | null
        }
        Update: {
          archived?: boolean
          body?: string
          category?: string
          created_at?: string
          created_by_email?: string | null
          id?: string
          source_id?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_notes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          published_at: string | null
          sample_size: number | null
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          published_at?: string | null
          sample_size?: number | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          published_at?: string | null
          sample_size?: number | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      knowledge_suggestions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reason: string | null
          reviewed_at: string | null
          reviewed_by_email: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by_email?: string | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by_email?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      lead_entitlements: {
        Row: {
          granted_at: string
          id: string
          lead_id: string
          metadata: Json
          payment_id: string | null
          product_code: string
        }
        Insert: {
          granted_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          payment_id?: string | null
          product_code: string
        }
        Update: {
          granted_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          payment_id?: string | null
          product_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_entitlements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_entitlements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "lead_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_payments: {
        Row: {
          amount_cents: number
          checkout_started_at: string | null
          created_at: string
          currency: string
          expired_at: string | null
          id: string
          instagram_username: string | null
          lead_id: string
          metadata: Json
          paid_at: string | null
          product: string
          provider: string | null
          provider_checkout_url: string | null
          provider_payment_id: string | null
          provider_reference: string | null
          report_cache_key: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_started_at?: string | null
          created_at?: string
          currency?: string
          expired_at?: string | null
          id?: string
          instagram_username?: string | null
          lead_id: string
          metadata?: Json
          paid_at?: string | null
          product: string
          provider?: string | null
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          provider_reference?: string | null
          report_cache_key?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_started_at?: string | null
          created_at?: string
          currency?: string
          expired_at?: string | null
          id?: string
          instagram_username?: string | null
          lead_id?: string
          metadata?: Json
          paid_at?: string | null
          product?: string
          provider?: string | null
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          provider_reference?: string | null
          report_cache_key?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reports: {
        Row: {
          analysis_snapshot_id: string | null
          cache_key: string
          created_at: string
          handle: string
          id: string
          lead_id: string
          source: string
        }
        Insert: {
          analysis_snapshot_id?: string | null
          cache_key: string
          created_at?: string
          handle: string
          id?: string
          lead_id: string
          source?: string
        }
        Update: {
          analysis_snapshot_id?: string | null
          cache_key?: string
          created_at?: string
          handle?: string
          id?: string
          lead_id?: string
          source?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          archived_at: string | null
          beta_consent: boolean
          beta_consent_at: string | null
          commercial_status: string
          company: string | null
          contacted_at: string | null
          created_at: string
          email: string
          email_normalized: string
          gdpr_consent_at: string | null
          gdpr_consent_version: string | null
          id: string
          internal_notes: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          name: string
          phone: string | null
          phone_normalized: string | null
          pricing_preference: string | null
          profile_ownership: string | null
          purpose: string | null
          source: string
          updated_at: string
          user_type: string | null
        }
        Insert: {
          archived_at?: string | null
          beta_consent?: boolean
          beta_consent_at?: string | null
          commercial_status?: string
          company?: string | null
          contacted_at?: string | null
          created_at?: string
          email: string
          email_normalized: string
          gdpr_consent_at?: string | null
          gdpr_consent_version?: string | null
          id?: string
          internal_notes?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name: string
          phone?: string | null
          phone_normalized?: string | null
          pricing_preference?: string | null
          profile_ownership?: string | null
          purpose?: string | null
          source?: string
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          archived_at?: string | null
          beta_consent?: boolean
          beta_consent_at?: string | null
          commercial_status?: string
          company?: string | null
          contacted_at?: string | null
          created_at?: string
          email?: string
          email_normalized?: string
          gdpr_consent_at?: string | null
          gdpr_consent_version?: string | null
          id?: string
          internal_notes?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string
          phone?: string | null
          phone_normalized?: string | null
          pricing_preference?: string | null
          profile_ownership?: string | null
          purpose?: string | null
          source?: string
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
      }
      payment_coupons: {
        Row: {
          active: boolean
          applies_to: string[]
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          max_uses: number | null
          notes: string | null
          updated_at: string
          uses: number
        }
        Insert: {
          active?: boolean
          applies_to?: string[]
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses?: number
        }
        Update: {
          active?: boolean
          applies_to?: string[]
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      pricing_interest: {
        Row: {
          comment: string | null
          created_at: string
          email: string | null
          email_normalized: string | null
          id: string
          ip_hash: string | null
          price_fairness: string | null
          pricing_option: string
          referrer: string | null
          user_agent: string | null
          would_pay: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          ip_hash?: string | null
          price_fairness?: string | null
          pricing_option: string
          referrer?: string | null
          user_agent?: string | null
          would_pay: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          ip_hash?: string | null
          price_fairness?: string | null
          pricing_option?: string
          referrer?: string | null
          user_agent?: string | null
          would_pay?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          active: boolean
          currency: string
          key: string
          label: string
          price_cents: number
          sort_order: number
          unit_label: string | null
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          active?: boolean
          currency?: string
          key: string
          label: string
          price_cents: number
          sort_order?: number
          unit_label?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          active?: boolean
          currency?: string
          key?: string
          label?: string
          price_cents?: number
          sort_order?: number
          unit_label?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: []
      }
      product_events: {
        Row: {
          actor_hash: string | null
          created_at: string
          event_type: string
          handle: string | null
          id: string
          lead_id: string | null
          metadata: Json
          snapshot_id: string | null
        }
        Insert: {
          actor_hash?: string | null
          created_at?: string
          event_type: string
          handle?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          snapshot_id?: string | null
        }
        Update: {
          actor_hash?: string | null
          created_at?: string
          event_type?: string
          handle?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          snapshot_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          lead_id: string | null
          plan: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          lead_id?: string | null
          plan?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          lead_id?: string | null
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_billing_import_batches: {
        Row: {
          created_at: string
          currency: string
          dashboard_total_actual_cost_usd: number
          id: string
          imported_total_displayed_cost_usd: number | null
          imported_total_raw_cost_usd: number | null
          period_end: string
          period_start: string
          provider: string
          raw_delta_usd: number | null
          reconciliation_status: string
          rounding_delta_usd: number | null
          source_note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          dashboard_total_actual_cost_usd?: number
          id?: string
          imported_total_displayed_cost_usd?: number | null
          imported_total_raw_cost_usd?: number | null
          period_end: string
          period_start: string
          provider: string
          raw_delta_usd?: number | null
          reconciliation_status?: string
          rounding_delta_usd?: number | null
          source_note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          dashboard_total_actual_cost_usd?: number
          id?: string
          imported_total_displayed_cost_usd?: number | null
          imported_total_raw_cost_usd?: number | null
          period_end?: string
          period_start?: string
          provider?: string
          raw_delta_usd?: number | null
          reconciliation_status?: string
          rounding_delta_usd?: number | null
          source_note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_billing_imports: {
        Row: {
          actor_or_model: string | null
          actual_cost_usd: number
          batch_id: string | null
          created_at: string
          currency: string
          displayed_cost_usd: number | null
          estimated_cost_usd: number | null
          id: string
          label: string | null
          metric_name: string | null
          notes: string | null
          period_end: string
          period_start: string
          provider: string
          quantity: number | null
          raw_calculated_cost_usd: number | null
          reconciliation_note: string | null
          service: string | null
          service_group: string | null
          source: string
          source_reference: string | null
          unit_price_usd: number | null
          updated_at: string
        }
        Insert: {
          actor_or_model?: string | null
          actual_cost_usd?: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          displayed_cost_usd?: number | null
          estimated_cost_usd?: number | null
          id?: string
          label?: string | null
          metric_name?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          provider: string
          quantity?: number | null
          raw_calculated_cost_usd?: number | null
          reconciliation_note?: string | null
          service?: string | null
          service_group?: string | null
          source: string
          source_reference?: string | null
          unit_price_usd?: number | null
          updated_at?: string
        }
        Update: {
          actor_or_model?: string | null
          actual_cost_usd?: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          displayed_cost_usd?: number | null
          estimated_cost_usd?: number | null
          id?: string
          label?: string | null
          metric_name?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          provider?: string
          quantity?: number | null
          raw_calculated_cost_usd?: number | null
          reconciliation_note?: string | null
          service?: string | null
          service_group?: string | null
          source?: string
          source_reference?: string | null
          unit_price_usd?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_billing_imports_batch"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "provider_billing_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_call_logs: {
        Row: {
          actor: string
          actual_cost_usd: number | null
          analysis_event_id: string | null
          apify_run_id: string | null
          completion_tokens: number | null
          created_at: string
          duration_ms: number | null
          error_excerpt: string | null
          estimated_cost_usd: number | null
          handle: string
          http_status: number | null
          id: string
          model: string | null
          network: string
          posts_returned: number
          prompt_tokens: number | null
          provider: string
          source_context: string
          status: string
          total_tokens: number | null
        }
        Insert: {
          actor: string
          actual_cost_usd?: number | null
          analysis_event_id?: string | null
          apify_run_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          handle: string
          http_status?: number | null
          id?: string
          model?: string | null
          network: string
          posts_returned?: number
          prompt_tokens?: number | null
          provider?: string
          source_context?: string
          status: string
          total_tokens?: number | null
        }
        Update: {
          actor?: string
          actual_cost_usd?: number | null
          analysis_event_id?: string | null
          apify_run_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          error_excerpt?: string | null
          estimated_cost_usd?: number | null
          handle?: string
          http_status?: number | null
          id?: string
          model?: string | null
          network?: string
          posts_returned?: number
          prompt_tokens?: number | null
          provider?: string
          source_context?: string
          status?: string
          total_tokens?: number | null
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
          report_snapshot_id: string | null
          request_month: string
          request_source: string
          request_status: string
          updated_at: string
          user_id: string | null
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
          report_snapshot_id?: string | null
          request_month?: string
          request_source?: string
          request_status?: string
          updated_at?: string
          user_id?: string | null
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
          report_snapshot_id?: string | null
          request_month?: string
          request_source?: string
          request_status?: string
          updated_at?: string
          user_id?: string | null
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
      report_snapshots: {
        Row: {
          algorithm_version: string
          competitor_usernames: Json
          created_at: string
          expired_at: string | null
          expires_at: string
          id: string
          instagram_username: string
          lead_id: string | null
          metadata: Json | null
          payload_schema_version: string
          pdf_storage_path: string | null
          report_payload_jsonb: Json
          report_request_id: string | null
          report_version: string
          source_analysis_snapshot_id: string
          user_id: string | null
        }
        Insert: {
          algorithm_version: string
          competitor_usernames?: Json
          created_at?: string
          expired_at?: string | null
          expires_at: string
          id?: string
          instagram_username: string
          lead_id?: string | null
          metadata?: Json | null
          payload_schema_version: string
          pdf_storage_path?: string | null
          report_payload_jsonb: Json
          report_request_id?: string | null
          report_version: string
          source_analysis_snapshot_id: string
          user_id?: string | null
        }
        Update: {
          algorithm_version?: string
          competitor_usernames?: Json
          created_at?: string
          expired_at?: string | null
          expires_at?: string
          id?: string
          instagram_username?: string
          lead_id?: string | null
          metadata?: Json | null
          payload_schema_version?: string
          pdf_storage_path?: string | null
          report_payload_jsonb?: Json
          report_request_id?: string | null
          report_version?: string
          source_analysis_snapshot_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      report_variant_overrides: {
        Row: {
          created_at: string
          features_json: Json
          id: string
          is_draft: boolean
          updated_at: string
          updated_by: string | null
          variant: string
        }
        Insert: {
          created_at?: string
          features_json: Json
          id?: string
          is_draft?: boolean
          updated_at?: string
          updated_by?: string | null
          variant: string
        }
        Update: {
          created_at?: string
          features_json?: Json
          id?: string
          is_draft?: boolean
          updated_at?: string
          updated_by?: string | null
          variant?: string
        }
        Relationships: []
      }
      service_inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          referrer: string | null
          status: string
          topic: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          referrer?: string | null
          status?: string
          topic: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          referrer?: string | null
          status?: string
          topic?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
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
      thumbnail_persistence_runs: {
        Row: {
          attempted: number
          avatar: string
          cache_key: string
          created_at: string
          duration_ms: number | null
          failed_403: number
          failed_invalid_content_type: number
          failed_other: number
          failed_timeout: number
          failed_upload: number
          handle: string
          id: string
          stored: number
        }
        Insert: {
          attempted?: number
          avatar?: string
          cache_key: string
          created_at?: string
          duration_ms?: number | null
          failed_403?: number
          failed_invalid_content_type?: number
          failed_other?: number
          failed_timeout?: number
          failed_upload?: number
          handle: string
          id?: string
          stored?: number
        }
        Update: {
          attempted?: number
          avatar?: string
          cache_key?: string
          created_at?: string
          duration_ms?: number | null
          failed_403?: number
          failed_invalid_content_type?: number
          failed_other?: number
          failed_timeout?: number
          failed_upload?: number
          handle?: string
          id?: string
          stored?: number
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
      credit_balance: { Args: { p_lead_id: string }; Returns: number }
      get_knowledge_context: {
        Args: { p_format: string; p_tier: string; p_vertical?: string }
        Returns: Json
      }
      link_user_to_existing_reports: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
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
      set_admin_email_session: { Args: { p_email: string }; Returns: undefined }
      set_enrichment_status: {
        Args: { p_key: string; p_snapshot_id: string; p_value: string }
        Returns: undefined
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
