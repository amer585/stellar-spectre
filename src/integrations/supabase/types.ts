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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_training_sessions: {
        Row: {
          accuracy_improvement: number | null
          created_at: string
          dataset_collection_id: string | null
          epoch_logs: Json | null
          id: string
          model_name: string | null
          model_path: string | null
          status: string
          trained_at: string | null
          training_config: Json | null
          training_images_count: number
          updated_at: string
          user_id: string
          validation_metrics: Json | null
        }
        Insert: {
          accuracy_improvement?: number | null
          created_at?: string
          dataset_collection_id?: string | null
          epoch_logs?: Json | null
          id?: string
          model_name?: string | null
          model_path?: string | null
          status?: string
          trained_at?: string | null
          training_config?: Json | null
          training_images_count?: number
          updated_at?: string
          user_id: string
          validation_metrics?: Json | null
        }
        Update: {
          accuracy_improvement?: number | null
          created_at?: string
          dataset_collection_id?: string | null
          epoch_logs?: Json | null
          id?: string
          model_name?: string | null
          model_path?: string | null
          status?: string
          trained_at?: string | null
          training_config?: Json | null
          training_images_count?: number
          updated_at?: string
          user_id?: string
          validation_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_sessions_dataset_collection_id_fkey"
            columns: ["dataset_collection_id"]
            isOneToOne: false
            referencedRelation: "dataset_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_collections: {
        Row: {
          categories: string[]
          created_at: string
          id: string
          max_images: number
          progress: Json | null
          sources: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories: string[]
          created_at?: string
          id?: string
          max_images?: number
          progress?: Json | null
          sources: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          id?: string
          max_images?: number
          progress?: Json | null
          sources?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dataset_images: {
        Row: {
          category: string
          collection_id: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          source: string
          status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          collection_id: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source: string
          status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          collection_id?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_images_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "dataset_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      image_metadata: {
        Row: {
          category: string
          created_at: string
          file_path: string
          id: string
          metadata: Json | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          file_path: string
          id: string
          metadata?: Json | null
          source: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          id?: string
          metadata?: Json | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_deployments: {
        Row: {
          accuracy: number | null
          created_at: string
          deployment_status: string
          endpoint_url: string
          f1_score: number | null
          id: string
          model_id: string
          model_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          deployment_status?: string
          endpoint_url: string
          f1_score?: number | null
          id?: string
          model_id: string
          model_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          deployment_status?: string
          endpoint_url?: string
          f1_score?: number | null
          id?: string
          model_id?: string
          model_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transit_analyses: {
        Row: {
          analysis_result: Json | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_registration_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          email: string
          full_name: string | null
          id: string
          notes: string | null
          requested_at: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
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
