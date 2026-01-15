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
      agent_sales: {
        Row: {
          agent_id: string
          booking_date: string
          commission_amount: number
          commission_rate: number
          created_at: string
          customer_name: string
          customer_phone: string
          departure_date: string | null
          id: string
          notes: string | null
          package_id: string | null
          package_name: string
          payment_proof_url: string | null
          sale_amount: number
          status: string
        }
        Insert: {
          agent_id: string
          booking_date?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_name: string
          customer_phone: string
          departure_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          package_name: string
          payment_proof_url?: string | null
          sale_amount?: number
          status?: string
        }
        Update: {
          agent_id?: string
          booking_date?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string
          departure_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          package_name?: string
          payment_proof_url?: string | null
          sale_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sales_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_short_links: {
        Row: {
          agent_id: string
          click_count: number
          created_at: string
          id: string
          original_url: string
          short_code: string
          title: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          click_count?: number
          created_at?: string
          id?: string
          original_url: string
          short_code: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          click_count?: number
          created_at?: string
          id?: string
          original_url?: string
          short_code?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_short_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_withdrawals: {
        Row: {
          account_name: string
          admin_notes: string | null
          agent_id: string
          amount: number
          bank_account: string
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          account_name: string
          admin_notes?: string | null
          agent_id: string
          amount: number
          bank_account: string
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          account_name?: string
          admin_notes?: string | null
          agent_id?: string
          amount?: number
          bank_account?: string
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_withdrawals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          account_name: string | null
          approved_at: string | null
          available_balance: number
          bank_account: string | null
          bank_name: string | null
          created_at: string
          email: string
          id: string
          level: string
          name: string
          phone: string
          referral_code: string
          referred_by_id: string | null
          status: string
          total_commission: number
          total_sales: number
          user_id: string
          wa_number: string | null
        }
        Insert: {
          account_name?: string | null
          approved_at?: string | null
          available_balance?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          email: string
          id?: string
          level?: string
          name: string
          phone: string
          referral_code: string
          referred_by_id?: string | null
          status?: string
          total_commission?: number
          total_sales?: number
          user_id: string
          wa_number?: string | null
        }
        Update: {
          account_name?: string | null
          approved_at?: string | null
          available_balance?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string
          id?: string
          level?: string
          name?: string
          phone?: string
          referral_code?: string
          referred_by_id?: string | null
          status?: string
          total_commission?: number
          total_sales?: number
          user_id?: string
          wa_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          canonical_url: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          published_at: string | null
          robots_meta: string | null
          schema_type: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          robots_meta?: string | null
          schema_type?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          robots_meta?: string | null
          schema_type?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      departure_schedules: {
        Row: {
          available_seats: number
          created_at: string
          departure_date: string
          id: string
          notes: string | null
          package_id: string | null
          return_date: string
          status: string
          updated_at: string
        }
        Insert: {
          available_seats?: number
          created_at?: string
          departure_date: string
          id?: string
          notes?: string | null
          package_id?: string | null
          return_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          available_seats?: number
          created_at?: string
          departure_date?: string
          id?: string
          notes?: string | null
          package_id?: string | null
          return_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departure_schedules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_section: {
        Row: {
          background_image: string | null
          created_at: string
          cta_link: string
          cta_text: string
          id: string
          is_active: boolean
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_image?: string | null
          created_at?: string
          cta_link?: string
          cta_text?: string
          id?: string
          is_active?: boolean
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          background_image?: string | null
          created_at?: string
          cta_link?: string
          cta_text?: string
          id?: string
          is_active?: boolean
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotels: {
        Row: {
          created_at: string
          distance: string
          id: string
          location: string
          name: string
          star_rating: number
          updated_at: string
          walking_duration: string
        }
        Insert: {
          created_at?: string
          distance: string
          id?: string
          location: string
          name: string
          star_rating: number
          updated_at?: string
          walking_duration: string
        }
        Update: {
          created_at?: string
          distance?: string
          id?: string
          location?: string
          name?: string
          star_rating?: number
          updated_at?: string
          walking_duration?: string
        }
        Relationships: []
      }
      marketing_materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_size: string | null
          file_url: string
          format: string | null
          id: string
          is_active: boolean
          package_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_url: string
          format?: string | null
          id?: string
          is_active?: boolean
          package_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_url?: string
          format?: string | null
          id?: string
          is_active?: boolean
          package_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_materials_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_settings: {
        Row: {
          ga4_enabled: boolean
          ga4_id: string | null
          id: string
          meta_pixel_enabled: boolean
          meta_pixel_id: string | null
          tiktok_pixel_enabled: boolean
          tiktok_pixel_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ga4_enabled?: boolean
          ga4_id?: string | null
          id?: string
          meta_pixel_enabled?: boolean
          meta_pixel_id?: string | null
          tiktok_pixel_enabled?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ga4_enabled?: boolean
          ga4_id?: string | null
          id?: string
          meta_pixel_enabled?: boolean
          meta_pixel_id?: string | null
          tiktok_pixel_enabled?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          available_tiers: string[] | null
          banner_image: string | null
          best_seller_transport: string | null
          canonical_url: string | null
          catalog_link: string | null
          commission_rate: number | null
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
          focus_keyword: string | null
          gallery_images: string[] | null
          id: string
          included_items: string | null
          is_sold_out: boolean
          itinerary_link: string | null
          madinah_distance: string | null
          madinah_duration_walk: string | null
          madinah_hotel_name: string | null
          madinah_hotel_star: number | null
          makkah_distance: string | null
          makkah_duration_walk: string | null
          makkah_hotel_name: string | null
          makkah_hotel_star: number | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          package_name: string
          package_price: Json
          robots_meta: string | null
          schema_type: string | null
          slots_filled: number | null
          slots_total: number | null
          slug: string | null
          sold_out_date: string | null
          status: string
          updated_at: string
          waitlist_count: number | null
        }
        Insert: {
          available_tiers?: string[] | null
          banner_image?: string | null
          best_seller_transport?: string | null
          canonical_url?: string | null
          catalog_link?: string | null
          commission_rate?: number | null
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
          focus_keyword?: string | null
          gallery_images?: string[] | null
          id?: string
          included_items?: string | null
          is_sold_out?: boolean
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          package_name: string
          package_price?: Json
          robots_meta?: string | null
          schema_type?: string | null
          slots_filled?: number | null
          slots_total?: number | null
          slug?: string | null
          sold_out_date?: string | null
          status?: string
          updated_at?: string
          waitlist_count?: number | null
        }
        Update: {
          available_tiers?: string[] | null
          banner_image?: string | null
          best_seller_transport?: string | null
          canonical_url?: string | null
          catalog_link?: string | null
          commission_rate?: number | null
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
          focus_keyword?: string | null
          gallery_images?: string[] | null
          id?: string
          included_items?: string | null
          is_sold_out?: boolean
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          package_name?: string
          package_price?: Json
          robots_meta?: string | null
          schema_type?: string | null
          slots_filled?: number | null
          slots_total?: number | null
          slug?: string | null
          sold_out_date?: string | null
          status?: string
          updated_at?: string
          waitlist_count?: number | null
        }
        Relationships: []
      }
      page_seo: {
        Row: {
          canonical_url: string | null
          created_at: string
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          page_name: string
          page_path: string
          robots_meta: string | null
          schema_type: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_name: string
          page_path: string
          robots_meta?: string | null
          schema_type?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_name?: string
          page_path?: string
          robots_meta?: string | null
          schema_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          from_path: string
          id: string
          is_active: boolean | null
          redirect_type: number | null
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      selling_points: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          created_at: string
          default_keywords: string | null
          default_og_image: string | null
          id: string
          robots_txt: string | null
          site_description: string | null
          site_title: string
          twitter_card_type: string | null
          twitter_site: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_keywords?: string | null
          default_og_image?: string | null
          id?: string
          robots_txt?: string | null
          site_description?: string | null
          site_title?: string
          twitter_card_type?: string | null
          twitter_site?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_keywords?: string | null
          default_og_image?: string | null
          id?: string
          robots_txt?: string | null
          site_description?: string | null
          site_title?: string
          twitter_card_type?: string | null
          twitter_site?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          display_order: number
          gender: string | null
          id: string
          image_url: string | null
          is_active: boolean
          location: string | null
          name: string
          rating: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          gender?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          name: string
          rating?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          gender?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          name?: string
          rating?: number
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
      website_settings: {
        Row: {
          address: string | null
          created_at: string
          email: string
          facebook_url: string | null
          google_maps_url: string | null
          google_review_url: string | null
          id: string
          instagram_url: string | null
          office_hours: string | null
          phone_number: string
          site_name: string
          site_tagline: string | null
          updated_at: string
          whatsapp_number: string
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string
          facebook_url?: string | null
          google_maps_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          office_hours?: string | null
          phone_number?: string
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
          whatsapp_number?: string
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          facebook_url?: string | null
          google_maps_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          office_hours?: string | null
          phone_number?: string
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
          whatsapp_number?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      whatsapp_cs: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string
          updated_at?: string
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
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify: { Args: { text_input: string }; Returns: string }
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
