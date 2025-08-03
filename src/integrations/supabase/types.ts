export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          budget_preference: string | null
          created_at: string
          display_name: string | null
          distance_priority: boolean | null
          household_type: string | null
          id: string
          latitude: number | null
          life_stage: string | null
          longitude: number | null
          priorities: string[] | null
          priority_preferences: Json | null
          settling_tasks: string[] | null
          transportation_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          display_name?: string | null
          distance_priority?: boolean | null
          household_type?: string | null
          id?: string
          latitude?: number | null
          life_stage?: string | null
          longitude?: number | null
          priorities?: string[] | null
          priority_preferences?: Json | null
          settling_tasks?: string[] | null
          transportation_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          display_name?: string | null
          distance_priority?: boolean | null
          household_type?: string | null
          id?: string
          latitude?: number | null
          life_stage?: string | null
          longitude?: number | null
          priorities?: string[] | null
          priority_preferences?: Json | null
          settling_tasks?: string[] | null
          transportation_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations_cache: {
        Row: {
          cache_key: string
          categories: string[]
          created_at: string
          expires_at: string
          id: string
          preferences: Json
          recommendations: Json
          user_coordinates: unknown
        }
        Insert: {
          cache_key: string
          categories: string[]
          created_at?: string
          expires_at?: string
          id?: string
          preferences?: Json
          recommendations: Json
          user_coordinates: unknown
        }
        Update: {
          cache_key?: string
          categories?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          preferences?: Json
          recommendations?: Json
          user_coordinates?: unknown
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
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
          is_displayed: boolean | null
          is_favorite: boolean
          relevance_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
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
          is_displayed?: boolean | null
          is_favorite?: boolean
          relevance_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
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
          is_displayed?: boolean | null
          is_favorite?: boolean
          relevance_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
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
