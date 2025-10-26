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
      articles: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          banner_image: string | null
          best_seller_transport: string | null
          catalog_link: string | null
          created_at: string
          departure_date: string
          duration_days: number
          equipment_list: string | null
          excluded_items: string | null
          five_star_madinah_distance: string | null
          five_star_madinah_duration_walk: string | null
          five_star_madinah_hotel_name: string | null
          five_star_madinah_hotel_star: number | null
          five_star_makkah_distance: string | null
          five_star_makkah_duration_walk: string | null
          five_star_makkah_hotel_name: string | null
          five_star_makkah_hotel_star: number | null
          five_star_package_price: Json | null
          five_star_transport: string | null
          flight: string
          flight_type: string
          gallery_images: string[] | null
          id: string
          included_items: string | null
          itinerary_link: string | null
          madinah_distance: string | null
          madinah_duration_walk: string | null
          madinah_hotel_name: string | null
          madinah_hotel_star: number | null
          makkah_distance: string | null
          makkah_duration_walk: string | null
          makkah_hotel_name: string | null
          makkah_hotel_star: number | null
          package_name: string
          package_price: Json
          status: string
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          best_seller_transport?: string | null
          catalog_link?: string | null
          created_at?: string
          departure_date: string
          duration_days: number
          equipment_list?: string | null
          excluded_items?: string | null
          five_star_madinah_distance?: string | null
          five_star_madinah_duration_walk?: string | null
          five_star_madinah_hotel_name?: string | null
          five_star_madinah_hotel_star?: number | null
          five_star_makkah_distance?: string | null
          five_star_makkah_duration_walk?: string | null
          five_star_makkah_hotel_name?: string | null
          five_star_makkah_hotel_star?: number | null
          five_star_package_price?: Json | null
          five_star_transport?: string | null
          flight: string
          flight_type: string
          gallery_images?: string[] | null
          id?: string
          included_items?: string | null
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          package_name: string
          package_price?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          best_seller_transport?: string | null
          catalog_link?: string | null
          created_at?: string
          departure_date?: string
          duration_days?: number
          equipment_list?: string | null
          excluded_items?: string | null
          five_star_madinah_distance?: string | null
          five_star_madinah_duration_walk?: string | null
          five_star_madinah_hotel_name?: string | null
          five_star_madinah_hotel_star?: number | null
          five_star_makkah_distance?: string | null
          five_star_makkah_duration_walk?: string | null
          five_star_makkah_hotel_name?: string | null
          five_star_makkah_hotel_star?: number | null
          five_star_package_price?: Json | null
          five_star_transport?: string | null
          flight?: string
          flight_type?: string
          gallery_images?: string[] | null
          id?: string
          included_items?: string | null
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          package_name?: string
          package_price?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wisata_halal: {
        Row: {
          airline: string | null
          created_at: string
          departure_city: string
          description: string | null
          destination: string
          duration: string
          facilities: Json | null
          id: string
          image_url: string | null
          price: string
          title: string
          updated_at: string
        }
        Insert: {
          airline?: string | null
          created_at?: string
          departure_city: string
          description?: string | null
          destination: string
          duration: string
          facilities?: Json | null
          id?: string
          image_url?: string | null
          price: string
          title: string
          updated_at?: string
        }
        Update: {
          airline?: string | null
          created_at?: string
          departure_city?: string
          description?: string | null
          destination?: string
          duration?: string
          facilities?: Json | null
          id?: string
          image_url?: string | null
          price?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
