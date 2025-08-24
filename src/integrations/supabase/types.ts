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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analytics_daily_aggregates: {
        Row: {
          created_at: string
          date: string
          id: string
          metadata: Json | null
          metric_key: string
          metric_type: string
          metric_value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          metadata?: Json | null
          metric_key: string
          metric_type: string
          metric_value?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          metric_key?: string
          metric_type?: string
          metric_value?: number
        }
        Relationships: []
      }
      business_access_logs: {
        Row: {
          access_type: string
          business_name: string | null
          created_at: string
          id: string
          ip_hash: string | null
          place_id: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          business_name?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          place_id?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          business_name?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          place_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_cache: {
        Row: {
          address: string | null
          business_name: string
          business_status: string | null
          created_at: string
          expires_at: string
          features: string[] | null
          id: string
          latitude: number | null
          location: unknown | null
          longitude: number | null
          opening_hours: Json | null
          phone: string | null
          photo_url: string | null
          place_id: string
          rating: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_status?: string | null
          created_at?: string
          expires_at?: string
          features?: string[] | null
          id?: string
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          place_id: string
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_status?: string | null
          created_at?: string
          expires_at?: string
          features?: string[] | null
          id?: string
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          place_id?: string
          rating?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      curated_property_places: {
        Row: {
          business_address: string | null
          business_description: string | null
          business_features: string[] | null
          business_name: string
          business_phone: string | null
          business_website: string | null
          category: string
          created_at: string
          distance_miles: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          place_id: string | null
          property_id: string
          rating: number | null
          sort_order: number | null
          subfilter_tags: string[] | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_name: string
          business_phone?: string | null
          business_website?: string | null
          category: string
          created_at?: string
          distance_miles?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          place_id?: string | null
          property_id: string
          rating?: number | null
          sort_order?: number | null
          subfilter_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_name?: string
          business_phone?: string | null
          business_website?: string | null
          category?: string
          created_at?: string
          distance_miles?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          place_id?: string | null
          property_id?: string
          rating?: number | null
          sort_order?: number | null
          subfilter_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_property_places_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      curation_templates: {
        Row: {
          business_address: string | null
          business_description: string | null
          business_features: string[] | null
          business_name: string
          business_phone: string | null
          business_website: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          subfilter_tags: string[] | null
          template_name: string
        }
        Insert: {
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_name: string
          business_phone?: string | null
          business_website?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          subfilter_tags?: string[] | null
          template_name: string
        }
        Update: {
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_name?: string
          business_phone?: string | null
          business_website?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          subfilter_tags?: string[] | null
          template_name?: string
        }
        Relationships: []
      }
      location_access_logs: {
        Row: {
          access_type: string
          accessed_user_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_user_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_user_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      micro_survey_questions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          options: Json | null
          priority: number | null
          question_key: string
          question_text: string
          question_type: string
          trigger_conditions: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          options?: Json | null
          priority?: number | null
          question_key: string
          question_text: string
          question_type?: string
          trigger_conditions?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          options?: Json | null
          priority?: number | null
          question_key?: string
          question_text?: string
          question_type?: string
          trigger_conditions?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          behavioral_triggers: Json | null
          budget_preference: string | null
          city_state: string | null
          created_at: string
          display_name: string | null
          distance_priority: boolean | null
          household_type: string | null
          id: string
          last_survey_shown_at: string | null
          latitude: number | null
          life_stage: string | null
          longitude: number | null
          micro_survey_responses: Json | null
          priorities: string[] | null
          priority_preferences: Json | null
          settling_tasks: string[] | null
          total_surveys_completed: number | null
          transportation_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          behavioral_triggers?: Json | null
          budget_preference?: string | null
          city_state?: string | null
          created_at?: string
          display_name?: string | null
          distance_priority?: boolean | null
          household_type?: string | null
          id?: string
          last_survey_shown_at?: string | null
          latitude?: number | null
          life_stage?: string | null
          longitude?: number | null
          micro_survey_responses?: Json | null
          priorities?: string[] | null
          priority_preferences?: Json | null
          settling_tasks?: string[] | null
          total_surveys_completed?: number | null
          transportation_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          behavioral_triggers?: Json | null
          budget_preference?: string | null
          city_state?: string | null
          created_at?: string
          display_name?: string | null
          distance_priority?: boolean | null
          household_type?: string | null
          id?: string
          last_survey_shown_at?: string | null
          latitude?: number | null
          life_stage?: string | null
          longitude?: number | null
          micro_survey_responses?: Json | null
          priorities?: string[] | null
          priority_preferences?: Json | null
          settling_tasks?: string[] | null
          total_surveys_completed?: number | null
          transportation_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          branding: Json | null
          contact_info: Json | null
          created_at: string
          curation_completed_at: string | null
          curation_status: string | null
          id: string
          latitude: number | null
          longitude: number | null
          manager_id: string
          property_name: string
          property_token: string
          total_curated_places: number | null
          updated_at: string
        }
        Insert: {
          address: string
          branding?: Json | null
          contact_info?: Json | null
          created_at?: string
          curation_completed_at?: string | null
          curation_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_id: string
          property_name: string
          property_token: string
          total_curated_places?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          branding?: Json | null
          contact_info?: Json | null
          created_at?: string
          curation_completed_at?: string | null
          curation_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager_id?: string
          property_name?: string
          property_token?: string
          total_curated_places?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      property_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          property_id: string
          tenant_link_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          property_id: string
          tenant_link_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          property_id?: string
          tenant_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_analytics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_analytics_tenant_link_id_fkey"
            columns: ["tenant_link_id"]
            isOneToOne: false
            referencedRelation: "tenant_links"
            referencedColumns: ["id"]
          },
        ]
      }
      property_manager_inquiries: {
        Row: {
          admin_notes: string | null
          company_name: string
          contact_name: string
          contacted_at: string | null
          created_at: string
          current_solution: string | null
          email: string
          id: string
          message: string | null
          phone: string | null
          property_count: string | null
          property_type: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          company_name: string
          contact_name: string
          contacted_at?: string | null
          created_at?: string
          current_solution?: string | null
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          property_count?: string | null
          property_type?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          company_name?: string
          contact_name?: string
          contacted_at?: string | null
          created_at?: string
          current_solution?: string | null
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          property_count?: string | null
          property_type?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations_cache: {
        Row: {
          cache_key: string
          categories: string[]
          coordinate_hash: string | null
          created_at: string
          expires_at: string
          id: string
          preferences: Json
          privacy_level: string | null
          recommendations: Json
          user_coordinates: unknown
          user_id: string | null
        }
        Insert: {
          cache_key: string
          categories: string[]
          coordinate_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          preferences?: Json
          privacy_level?: string | null
          recommendations: Json
          user_coordinates: unknown
          user_id?: string | null
        }
        Update: {
          cache_key?: string
          categories?: string[]
          coordinate_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          preferences?: Json
          privacy_level?: string | null
          recommendations?: Json
          user_coordinates?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      secure_sessions: {
        Row: {
          created_at: string
          fingerprint_hash: string | null
          id: string
          ip_hash: string | null
          is_suspicious: boolean | null
          last_activity_at: string
          security_score: number | null
          session_id: string
          user_agent_hash: string | null
          user_id: string | null
          validation_failures: number | null
        }
        Insert: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          is_suspicious?: boolean | null
          last_activity_at?: string
          security_score?: number | null
          session_id: string
          user_agent_hash?: string | null
          user_id?: string | null
          validation_failures?: number | null
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string | null
          id?: string
          ip_hash?: string | null
          is_suspicious?: boolean | null
          last_activity_at?: string
          security_score?: number | null
          session_id?: string
          user_agent_hash?: string | null
          user_id?: string | null
          validation_failures?: number | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          ip_hash: string | null
          session_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          ip_hash?: string | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          ip_hash?: string | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          created_at: string
          id: string
          name: string
          price_per_property: number
          signup_fee: number
          trial_days: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_per_property: number
          signup_fee: number
          trial_days?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_per_property?: number
          signup_fee?: number
          trial_days?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          properties_count: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string | null
          trial_end_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          properties_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          properties_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_links: {
        Row: {
          cache_warmed_at: string | null
          contact_info: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          move_in_date: string | null
          property_id: string
          tenant_name: string
          tenant_token: string
          unit_number: string | null
          updated_at: string
        }
        Insert: {
          cache_warmed_at?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          move_in_date?: string | null
          property_id: string
          tenant_name: string
          tenant_token: string
          unit_number?: string | null
          updated_at?: string
        }
        Update: {
          cache_warmed_at?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          move_in_date?: string | null
          property_id?: string
          tenant_name?: string
          tenant_token?: string
          unit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_signup_charges: {
        Row: {
          charge_amount: number
          charged_at: string | null
          created_at: string
          id: string
          property_id: string | null
          signup_date: string
          status: string
          stripe_usage_record_id: string | null
          subscription_id: string | null
          tenant_link_id: string | null
        }
        Insert: {
          charge_amount?: number
          charged_at?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          signup_date?: string
          status?: string
          stripe_usage_record_id?: string | null
          subscription_id?: string | null
          tenant_link_id?: string | null
        }
        Update: {
          charge_amount?: number
          charged_at?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          signup_date?: string
          status?: string
          stripe_usage_record_id?: string | null
          subscription_id?: string | null
          tenant_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_signup_charges_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_signup_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_signup_charges_tenant_link_id_fkey"
            columns: ["tenant_link_id"]
            isOneToOne: false
            referencedRelation: "tenant_links"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_events: {
        Row: {
          created_at: string
          event_category: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
          ai_scores: Json | null
          business_address: string | null
          business_description: string | null
          business_features: string[] | null
          business_image: string | null
          business_latitude: number | null
          business_longitude: number | null
          business_name: string
          business_phone: string | null
          business_website: string | null
          category: string
          created_at: string
          distance_miles: number | null
          filter_metadata: Json | null
          id: string
          interaction_count: number | null
          is_displayed: boolean | null
          is_favorite: boolean
          place_id: string | null
          recommendation_engine: string | null
          relevance_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_scores?: Json | null
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_image?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_name: string
          business_phone?: string | null
          business_website?: string | null
          category: string
          created_at?: string
          distance_miles?: number | null
          filter_metadata?: Json | null
          id?: string
          interaction_count?: number | null
          is_displayed?: boolean | null
          is_favorite?: boolean
          place_id?: string | null
          recommendation_engine?: string | null
          relevance_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_scores?: Json | null
          business_address?: string | null
          business_description?: string | null
          business_features?: string[] | null
          business_image?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_name?: string
          business_phone?: string | null
          business_website?: string | null
          category?: string
          created_at?: string
          distance_miles?: number | null
          filter_metadata?: Json | null
          id?: string
          interaction_count?: number | null
          is_displayed?: boolean | null
          is_favorite?: boolean
          place_id?: string | null
          recommendation_engine?: string | null
          relevance_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          contract_status: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_status?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_status?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          favorites_added: number | null
          id: string
          ip_address: unknown | null
          ip_hash: string | null
          is_suspicious: boolean | null
          page_views: number | null
          recommendations_clicked: number | null
          recommendations_viewed: number | null
          security_score: number | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          favorites_added?: number | null
          id?: string
          ip_address?: unknown | null
          ip_hash?: string | null
          is_suspicious?: boolean | null
          page_views?: number | null
          recommendations_clicked?: number | null
          recommendations_viewed?: number | null
          security_score?: number | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          favorites_added?: number | null
          id?: string
          ip_address?: unknown | null
          ip_hash?: string | null
          is_suspicious?: boolean | null
          page_views?: number | null
          recommendations_clicked?: number | null
          recommendations_viewed?: number | null
          security_score?: number | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_property_manager: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      aggregate_daily_analytics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      cleanup_expired_business_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_suspicious_activity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      extract_city_state: {
        Args: { full_address: string }
        Returns: string
      }
      get_cache_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_pm_contract: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_user_coordinates: {
        Args: { lat: number; lng: number; user_id: string }
        Returns: string
      }
      increment_interaction: {
        Args: { p_business_name: string; p_category: string; p_user_id: string }
        Returns: undefined
      }
      log_business_access: {
        Args: {
          p_access_type?: string
          p_business_name: string
          p_place_id?: string
        }
        Returns: undefined
      }
      log_cache_access: {
        Args: {
          p_access_pattern: string
          p_cache_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      log_tenant_signup_charge: {
        Args: { p_property_id: string; p_tenant_link_id: string }
        Returns: string
      }
      populate_cache_from_curation: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      validate_session_security: {
        Args: {
          p_ip_address: unknown
          p_session_id: string
          p_user_agent: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "property_manager"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "property_manager"],
    },
  },
} as const
