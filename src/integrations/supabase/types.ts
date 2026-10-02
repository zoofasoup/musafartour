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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      agent_badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points_reward: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          points_reward?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points_reward?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      agent_challenge_progress: {
        Row: {
          agent_id: string
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
        }
        Insert: {
          agent_id: string
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
        }
        Update: {
          agent_id?: string
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_challenge_progress_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_challenge_progress_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "agent_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_challenges: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          is_active: boolean
          reward_type: string
          reward_value: string
          start_date: string
          target_type: string
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean
          reward_type?: string
          reward_value: string
          start_date: string
          target_type?: string
          target_value?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean
          reward_type?: string
          reward_value?: string
          start_date?: string
          target_type?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      agent_earned_badges: {
        Row: {
          agent_id: string
          badge_id: string
          earned_at: string
          id: string
        }
        Insert: {
          agent_id: string
          badge_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          agent_id?: string
          badge_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_earned_badges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earned_badges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "agent_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_levels: {
        Row: {
          benefits: string[] | null
          commission_rate_max: number
          commission_rate_min: number
          created_at: string
          level_name: string
          max_sales: number | null
          min_sales: number
        }
        Insert: {
          benefits?: string[] | null
          commission_rate_max?: number
          commission_rate_min?: number
          created_at?: string
          level_name: string
          max_sales?: number | null
          min_sales?: number
        }
        Update: {
          benefits?: string[] | null
          commission_rate_max?: number
          commission_rate_min?: number
          created_at?: string
          level_name?: string
          max_sales?: number | null
          min_sales?: number
        }
        Relationships: []
      }
      agent_points: {
        Row: {
          agent_id: string
          available_points: number | null
          id: string
          redeemed_points: number
          total_points: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          available_points?: number | null
          id?: string
          redeemed_points?: number
          total_points?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          available_points?: number | null
          id?: string
          redeemed_points?: number
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_points_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_points_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_rewards: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          stock: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost: number
          stock?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          stock?: number | null
        }
        Relationships: []
      }
      agent_sales: {
        Row: {
          agent_id: string
          booking_date: string
          booking_id: string | null
          registration_id: string | null
          commission_amount: number
          commission_rate: number | null
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
          source: string
          status: string
        }
        Insert: {
          agent_id: string
          booking_date?: string
          booking_id?: string | null
          registration_id?: string | null
          commission_amount?: number
          commission_rate?: number | null
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
          source?: string
          status?: string
        }
        Update: {
          agent_id?: string
          booking_date?: string
          booking_id?: string | null
          registration_id?: string | null
          commission_amount?: number
          commission_rate?: number | null
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
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sales_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
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
          address: string | null
          agency_name: string | null
          approved_at: string | null
          available_balance: number
          bank_account: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          email: string
          experience_level: string | null
          id: string
          ktp_image_url: string | null
          ktp_number: string | null
          level: string
          name: string
          phone: string
          province: string | null
          referral_code: string
          referred_by_id: string | null
          social_links: Json | null
          status: string
          total_commission: number
          total_sales: number
          user_id: string
          wa_number: string | null
        }
        Insert: {
          account_name?: string | null
          address?: string | null
          agency_name?: string | null
          approved_at?: string | null
          available_balance?: number
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          id?: string
          ktp_image_url?: string | null
          ktp_number?: string | null
          level?: string
          name: string
          phone: string
          province?: string | null
          referral_code: string
          referred_by_id?: string | null
          social_links?: Json | null
          status?: string
          total_commission?: number
          total_sales?: number
          user_id: string
          wa_number?: string | null
        }
        Update: {
          account_name?: string | null
          address?: string | null
          agency_name?: string | null
          approved_at?: string | null
          available_balance?: number
          bank_account?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          id?: string
          ktp_image_url?: string | null
          ktp_number?: string | null
          level?: string
          name?: string
          phone?: string
          province?: string | null
          referral_code?: string
          referred_by_id?: string | null
          social_links?: Json | null
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
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      article_pipeline_runs: {
        Row: {
          articles_published: number
          articles_skipped: number
          details: Json
          error: string | null
          finished_at: string | null
          id: string
          publish_status: string
          regenerations: number
          run_date: string
          started_at: string
          topics_attempted: number
          trending_used: boolean
        }
        Insert: {
          articles_published?: number
          articles_skipped?: number
          details?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          publish_status: string
          regenerations?: number
          run_date?: string
          started_at?: string
          topics_attempted?: number
          trending_used?: boolean
        }
        Update: {
          articles_published?: number
          articles_skipped?: number
          details?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          publish_status?: string
          regenerations?: number
          run_date?: string
          started_at?: string
          topics_attempted?: number
          trending_used?: boolean
        }
        Relationships: []
      }
      article_pipeline_topics: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          kind: string
          skip_reason: string | null
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          skip_reason?: string | null
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          skip_reason?: string | null
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_pipeline_topics_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
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
          is_ai_generated: boolean
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          pipeline_run_id: string | null
          publish_at: string | null
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
          is_ai_generated?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pipeline_run_id?: string | null
          publish_at?: string | null
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
          is_ai_generated?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pipeline_run_id?: string | null
          publish_at?: string | null
          published_at?: string | null
          robots_meta?: string | null
          schema_type?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_pipeline_run_id_fkey"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "article_pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          admin_fee: number
          amount: number
          bank: string | null
          booking_id: string
          created_at: string
          id: string
          midtrans_order_id: string
          midtrans_transaction_id: string | null
          override_notes: string | null
          paid_at: string | null
          settled_by_admin_id: string | null
          status: string
          total_charged: number
          va_number: string | null
        }
        Insert: {
          admin_fee?: number
          amount: number
          bank?: string | null
          booking_id: string
          created_at?: string
          id?: string
          midtrans_order_id: string
          midtrans_transaction_id?: string | null
          override_notes?: string | null
          paid_at?: string | null
          settled_by_admin_id?: string | null
          status?: string
          total_charged: number
          va_number?: string | null
        }
        Update: {
          admin_fee?: number
          amount?: number
          bank?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          midtrans_order_id?: string
          midtrans_transaction_id?: string | null
          override_notes?: string | null
          paid_at?: string | null
          settled_by_admin_id?: string | null
          status?: string
          total_charged?: number
          va_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_travelers: {
        Row: {
          booking_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          is_primary_contact: boolean
          passport_number: string | null
          phone: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          is_primary_contact?: boolean
          passport_number?: string | null
          phone?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          is_primary_contact?: boolean
          passport_number?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_travelers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: string | null
          amount_paid: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by_admin_id: string | null
          commission_credited: boolean
          created_at: string
          dp_required: number
          hold_expires_at: string | null
          id: string
          jamaah_id: string
          package_id: string
          price_per_person: number
          refund_due: number | null
          refund_sent_at: string | null
          room_type: string
          status: string
          total_price: number
          traveler_count: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount_paid?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_admin_id?: string | null
          commission_credited?: boolean
          created_at?: string
          dp_required: number
          hold_expires_at?: string | null
          id?: string
          jamaah_id: string
          package_id: string
          price_per_person: number
          refund_due?: number | null
          refund_sent_at?: string | null
          room_type: string
          status?: string
          total_price: number
          traveler_count: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount_paid?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_admin_id?: string | null
          commission_credited?: boolean
          created_at?: string
          dp_required?: number
          hold_expires_at?: string | null
          id?: string
          jamaah_id?: string
          package_id?: string
          price_per_person?: number
          refund_due?: number | null
          refund_sent_at?: string | null
          room_type?: string
          status?: string
          total_price?: number
          traveler_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_spend: {
        Row: {
          amount: number
          campaign_name: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          platform: string
        }
        Insert: {
          amount: number
          campaign_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          platform?: string
        }
        Update: {
          amount?: number
          campaign_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          platform?: string
        }
        Relationships: []
      }
      cogs_defaults: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
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
      equipment_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          city_name: string | null
          created_at: string
          distance: string
          exterior_photo: string | null
          google_maps_url: string | null
          id: string
          lobby_photo: string | null
          location: string
          name: string
          room_photo: string | null
          star_rating: number
          updated_at: string
          walking_duration: string
        }
        Insert: {
          city_name?: string | null
          created_at?: string
          distance: string
          exterior_photo?: string | null
          google_maps_url?: string | null
          id?: string
          lobby_photo?: string | null
          location: string
          name: string
          room_photo?: string | null
          star_rating: number
          updated_at?: string
          walking_duration: string
        }
        Update: {
          city_name?: string | null
          created_at?: string
          distance?: string
          exterior_photo?: string | null
          google_maps_url?: string | null
          id?: string
          lobby_photo?: string | null
          location?: string
          name?: string
          room_photo?: string | null
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
      package_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_essential: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_essential?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_essential?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_change_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          changes: Json
          created_at: string
          id: string
          package_id: string
          package_label: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          package_id: string
          package_label?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          package_id?: string
          package_label?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      jamaah_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          changes: Json
          created_at: string
          id: string
          registration_id: string | null
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          registration_id?: string | null
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          registration_id?: string | null
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      jamaah_groups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          package_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          package_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          package_id?: string
        }
        Relationships: []
      }
      jamaah_intake_people: {
        Row: {
          category: string
          created_at: string
          full_name: string
          gender: string
          id: string
          intake_id: string
          position: number
          registration_id: string | null
          relation: string | null
          room_type: string
        }
        Insert: {
          category: string
          created_at?: string
          full_name: string
          gender: string
          id?: string
          intake_id: string
          position: number
          registration_id?: string | null
          relation?: string | null
          room_type: string
        }
        Update: {
          category?: string
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          intake_id?: string
          position?: number
          registration_id?: string | null
          relation?: string | null
          room_type?: string
        }
        Relationships: []
      }
      jamaah_intakes: {
        Row: {
          agent_id: string | null
          code: string
          consent_at: string
          consent_version: string
          contact_attending: boolean
          contact_city: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          heard_from: string | null
          id: string
          manifest_token: string
          notes: string | null
          package_id: string
          pay_together: boolean
          ref_code: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
        }
        Insert: {
          agent_id?: string | null
          code: string
          consent_at: string
          consent_version: string
          contact_attending?: boolean
          contact_city?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          heard_from?: string | null
          id?: string
          manifest_token?: string
          notes?: string | null
          package_id: string
          pay_together?: boolean
          ref_code?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
        }
        Update: {
          agent_id?: string | null
          code?: string
          consent_at?: string
          consent_version?: string
          contact_attending?: boolean
          contact_city?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          heard_from?: string | null
          id?: string
          manifest_token?: string
          notes?: string | null
          package_id?: string
          pay_together?: boolean
          ref_code?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      jamaah_payments: {
        Row: {
          amount: number
          bank_account: string
          id: string
          notes: string | null
          paid_on: string
          payer_name: string | null
          proof_path: string | null
          recorded_at: string
          recorded_by: string | null
          registration_id: string
          reject_reason: string | null
          status: string
          transfer_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bank_account: string
          id?: string
          notes?: string | null
          paid_on: string
          payer_name?: string | null
          proof_path?: string | null
          recorded_at?: string
          recorded_by?: string | null
          registration_id: string
          reject_reason?: string | null
          status?: string
          transfer_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string
          id?: string
          notes?: string | null
          paid_on?: string
          payer_name?: string | null
          proof_path?: string | null
          recorded_at?: string
          recorded_by?: string | null
          registration_id?: string
          reject_reason?: string | null
          status?: string
          transfer_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      jamaah_registrations: {
        Row: {
          agent_id: string | null
          birth_place: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          commission_skipped: boolean
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          discount: number
          domicile: string | null
          equipment_size: string | null
          equipment_taken_at: string | null
          full_name: string
          gender: string | null
          group_id: string | null
          id: string
          intake_id: string | null
          ktp_path: string | null
          list_price: number
          mahram_name: string | null
          mahram_relation: string | null
          meningitis_vaccinated_at: string | null
          nik: string | null
          notes: string | null
          package_id: string
          passport_expiry: string | null
          passport_issue_office: string | null
          passport_issued_at: string | null
          passport_number: string | null
          passport_path: string | null
          phone: string | null
          photo_path: string | null
          polio_vaccinated_at: string | null
          price_note: string | null
          referral_note: string | null
          refund_amount: number | null
          refund_paid_at: string | null
          room_type: string
          roommate_note: string | null
          start_city: string | null
          status: string
          updated_at: string
          father_name: string | null
          marital_status: string | null
          address: string | null
          email: string | null
          occupation: string | null
          education: string | null
          blood_type: string | null
          emergency_name: string | null
          emergency_relation: string | null
          emergency_phone: string | null
          medical_notes: string | null
        }
        Insert: {
          agent_id?: string | null
          birth_place?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_skipped?: boolean
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discount?: number
          domicile?: string | null
          equipment_size?: string | null
          equipment_taken_at?: string | null
          full_name: string
          gender?: string | null
          group_id?: string | null
          id?: string
          intake_id?: string | null
          ktp_path?: string | null
          list_price: number
          mahram_name?: string | null
          mahram_relation?: string | null
          meningitis_vaccinated_at?: string | null
          nik?: string | null
          notes?: string | null
          package_id: string
          passport_expiry?: string | null
          passport_issue_office?: string | null
          passport_issued_at?: string | null
          passport_number?: string | null
          passport_path?: string | null
          phone?: string | null
          photo_path?: string | null
          polio_vaccinated_at?: string | null
          price_note?: string | null
          referral_note?: string | null
          refund_amount?: number | null
          refund_paid_at?: string | null
          room_type: string
          roommate_note?: string | null
          start_city?: string | null
          status?: string
          updated_at?: string
          father_name?: string | null
          marital_status?: string | null
          address?: string | null
          email?: string | null
          occupation?: string | null
          education?: string | null
          blood_type?: string | null
          emergency_name?: string | null
          emergency_relation?: string | null
          emergency_phone?: string | null
          medical_notes?: string | null
        }
        Update: {
          agent_id?: string | null
          birth_place?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_skipped?: boolean
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          discount?: number
          domicile?: string | null
          equipment_size?: string | null
          equipment_taken_at?: string | null
          full_name?: string
          gender?: string | null
          group_id?: string | null
          id?: string
          intake_id?: string | null
          ktp_path?: string | null
          list_price?: number
          mahram_name?: string | null
          mahram_relation?: string | null
          meningitis_vaccinated_at?: string | null
          nik?: string | null
          notes?: string | null
          package_id?: string
          passport_expiry?: string | null
          passport_issue_office?: string | null
          passport_issued_at?: string | null
          passport_number?: string | null
          passport_path?: string | null
          phone?: string | null
          photo_path?: string | null
          polio_vaccinated_at?: string | null
          price_note?: string | null
          referral_note?: string | null
          refund_amount?: number | null
          refund_paid_at?: string | null
          room_type?: string
          roommate_note?: string | null
          start_city?: string | null
          status?: string
          updated_at?: string
          father_name?: string | null
          marital_status?: string | null
          address?: string | null
          email?: string | null
          occupation?: string | null
          education?: string | null
          blood_type?: string | null
          emergency_name?: string | null
          emergency_relation?: string | null
          emergency_phone?: string | null
          medical_notes?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          agent_commission_amount: number
          available_tiers: string[] | null
          banner_image: string | null
          best_seller_transport: string | null
          canonical_url: string | null
          catalog_link: string | null
          change_reason: string | null
          cogs_data: Json | null
          cogs_status: string | null
          created_at: string
          departure_date: string
          dp_amount: number
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
          hemat_madinah_distance: string | null
          hemat_madinah_duration_walk: string | null
          hemat_madinah_hotel_name: string | null
          hemat_madinah_hotel_star: number | null
          hemat_makkah_distance: string | null
          hemat_makkah_duration_walk: string | null
          hemat_makkah_hotel_name: string | null
          hemat_makkah_hotel_star: number | null
          hemat_package_price: Json | null
          hemat_transport: string | null
          hotel_extra: string | null
          id: string
          included_items: string | null
          is_sold_out: boolean
          itinerary: string | null
          itinerary_link: string | null
          madinah_distance: string | null
          madinah_duration_walk: string | null
          madinah_hotel_name: string | null
          madinah_hotel_star: number | null
          makkah_distance: string | null
          makkah_duration_walk: string | null
          makkah_hotel_name: string | null
          makkah_hotel_star: number | null
          max_discount: number | null
          meta_description: string | null
          meta_title: string | null
          nights_extra: number | null
          nights_madinah: number | null
          nights_makkah: number | null
          og_image: string | null
          package_name: string
          package_price: Json
          pelataran_madinah_distance: string | null
          pelataran_madinah_duration_walk: string | null
          pelataran_madinah_hotel_name: string | null
          pelataran_madinah_hotel_star: number | null
          pelataran_makkah_distance: string | null
          pelataran_makkah_duration_walk: string | null
          pelataran_makkah_hotel_name: string | null
          pelataran_makkah_hotel_star: number | null
          pelataran_package_price: Json | null
          pelataran_transport: string | null
          robots_meta: string | null
          route: string | null
          schema_type: string | null
          selling_points: string | null
          slots_booked_online: number
          slots_filled: number | null
          seat_source: string
          slots_registered: number
          slots_total: number | null
          slug: string
          sold_out_date: string | null
          start_airport: string | null
          status: string
          tiers_data: Json | null
          timeframe: string | null
          updated_at: string
          waitlist_count: number | null
        }
        Insert: {
          agent_commission_amount?: number
          available_tiers?: string[] | null
          banner_image?: string | null
          best_seller_transport?: string | null
          canonical_url?: string | null
          catalog_link?: string | null
          change_reason?: string | null
          cogs_data?: Json | null
          cogs_status?: string | null
          created_at?: string
          departure_date: string
          dp_amount?: number
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
          hemat_madinah_distance?: string | null
          hemat_madinah_duration_walk?: string | null
          hemat_madinah_hotel_name?: string | null
          hemat_madinah_hotel_star?: number | null
          hemat_makkah_distance?: string | null
          hemat_makkah_duration_walk?: string | null
          hemat_makkah_hotel_name?: string | null
          hemat_makkah_hotel_star?: number | null
          hemat_package_price?: Json | null
          hemat_transport?: string | null
          hotel_extra?: string | null
          id?: string
          included_items?: string | null
          is_sold_out?: boolean
          itinerary?: string | null
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          max_discount?: number | null
          meta_description?: string | null
          meta_title?: string | null
          nights_extra?: number | null
          nights_madinah?: number | null
          nights_makkah?: number | null
          og_image?: string | null
          package_name: string
          package_price?: Json
          pelataran_madinah_distance?: string | null
          pelataran_madinah_duration_walk?: string | null
          pelataran_madinah_hotel_name?: string | null
          pelataran_madinah_hotel_star?: number | null
          pelataran_makkah_distance?: string | null
          pelataran_makkah_duration_walk?: string | null
          pelataran_makkah_hotel_name?: string | null
          pelataran_makkah_hotel_star?: number | null
          pelataran_package_price?: Json | null
          pelataran_transport?: string | null
          robots_meta?: string | null
          route?: string | null
          schema_type?: string | null
          selling_points?: string | null
          slots_booked_online?: number
          slots_filled?: number | null
          seat_source?: string
          slots_registered?: number
          slots_total?: number | null
          slug?: string
          sold_out_date?: string | null
          start_airport?: string | null
          status?: string
          tiers_data?: Json | null
          timeframe?: string | null
          updated_at?: string
          waitlist_count?: number | null
        }
        Update: {
          agent_commission_amount?: number
          available_tiers?: string[] | null
          banner_image?: string | null
          best_seller_transport?: string | null
          canonical_url?: string | null
          catalog_link?: string | null
          change_reason?: string | null
          cogs_data?: Json | null
          cogs_status?: string | null
          created_at?: string
          departure_date?: string
          dp_amount?: number
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
          hemat_madinah_distance?: string | null
          hemat_madinah_duration_walk?: string | null
          hemat_madinah_hotel_name?: string | null
          hemat_madinah_hotel_star?: number | null
          hemat_makkah_distance?: string | null
          hemat_makkah_duration_walk?: string | null
          hemat_makkah_hotel_name?: string | null
          hemat_makkah_hotel_star?: number | null
          hemat_package_price?: Json | null
          hemat_transport?: string | null
          hotel_extra?: string | null
          id?: string
          included_items?: string | null
          is_sold_out?: boolean
          itinerary?: string | null
          itinerary_link?: string | null
          madinah_distance?: string | null
          madinah_duration_walk?: string | null
          madinah_hotel_name?: string | null
          madinah_hotel_star?: number | null
          makkah_distance?: string | null
          makkah_duration_walk?: string | null
          makkah_hotel_name?: string | null
          makkah_hotel_star?: number | null
          max_discount?: number | null
          meta_description?: string | null
          meta_title?: string | null
          nights_extra?: number | null
          nights_madinah?: number | null
          nights_makkah?: number | null
          og_image?: string | null
          package_name?: string
          package_price?: Json
          pelataran_madinah_distance?: string | null
          pelataran_madinah_duration_walk?: string | null
          pelataran_madinah_hotel_name?: string | null
          pelataran_madinah_hotel_star?: number | null
          pelataran_makkah_distance?: string | null
          pelataran_makkah_duration_walk?: string | null
          pelataran_makkah_hotel_name?: string | null
          pelataran_makkah_hotel_star?: number | null
          pelataran_package_price?: Json | null
          pelataran_transport?: string | null
          robots_meta?: string | null
          route?: string | null
          schema_type?: string | null
          selling_points?: string | null
          slots_booked_online?: number
          slots_filled?: number | null
          seat_source?: string
          slots_registered?: number
          slots_total?: number | null
          slug?: string
          sold_out_date?: string | null
          start_airport?: string | null
          status?: string
          tiers_data?: Json | null
          timeframe?: string | null
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
      site_events: {
        Row: {
          created_at: string
          device: string | null
          event: string
          id: number
          lead_source: string | null
          package_id: string | null
          path: string
          referrer_host: string | null
          session_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          event: string
          id?: number
          lead_source?: string | null
          package_id?: string | null
          path: string
          referrer_host?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          event?: string
          id?: number
          lead_source?: string | null
          package_id?: string | null
          path?: string
          referrer_host?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      short_link_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_hash: string | null
          link_id: string
          referer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          link_id: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          link_id?: string
          referer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          original_url: string
          short_code: string
          title: string | null
          updated_at: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          original_url: string
          short_code: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          click_count?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          original_url?: string
          short_code?: string
          title?: string | null
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
      umroh_calculator_leads: {
        Row: {
          assigned_to: string | null
          assigned_to_email: string | null
          calculated_daily_target: number | null
          calculated_monthly_target: number | null
          companion_name: string | null
          created_at: string
          ctwa_clid: string | null
          daily_target: number | null
          event_id: string | null
          existing_savings: number
          fbclid: string | null
          id: string
          mode: string
          monthly_saving: number
          months_to_departure: number | null
          name: string
          pilgrim_count: number
          recommended_package_id: string | null
          recommended_tier: string | null
          referrer: string | null
          result_data: Json | null
          selected_package: string | null
          share_token: string
          status: string
          target_timeframe_months: number | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          calculated_daily_target?: number | null
          calculated_monthly_target?: number | null
          companion_name?: string | null
          created_at?: string
          ctwa_clid?: string | null
          daily_target?: number | null
          event_id?: string | null
          existing_savings?: number
          fbclid?: string | null
          id?: string
          mode?: string
          monthly_saving: number
          months_to_departure?: number | null
          name: string
          pilgrim_count?: number
          recommended_package_id?: string | null
          recommended_tier?: string | null
          referrer?: string | null
          result_data?: Json | null
          selected_package?: string | null
          share_token?: string
          status?: string
          target_timeframe_months?: number | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          calculated_daily_target?: number | null
          calculated_monthly_target?: number | null
          companion_name?: string | null
          created_at?: string
          ctwa_clid?: string | null
          daily_target?: number | null
          event_id?: string | null
          existing_savings?: number
          fbclid?: string | null
          id?: string
          mode?: string
          monthly_saving?: number
          months_to_departure?: number | null
          name?: string
          pilgrim_count?: number
          recommended_package_id?: string | null
          recommended_tier?: string | null
          referrer?: string | null
          result_data?: Json | null
          selected_package?: string | null
          share_token?: string
          status?: string
          target_timeframe_months?: number | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "umroh_calculator_leads_recommended_package_id_fkey"
            columns: ["recommended_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
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
          bank_names: string[] | null
          company_legal_name: string | null
          created_at: string
          email: string
          facebook_url: string | null
          google_maps_url: string | null
          google_review_url: string | null
          id: string
          instagram_url: string | null
          office_hours: string | null
          phone_number: string
          ppiu_license_number: string | null
          site_name: string
          site_tagline: string | null
          updated_at: string
          whatsapp_number: string
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          bank_names?: string[] | null
          company_legal_name?: string | null
          created_at?: string
          email?: string
          facebook_url?: string | null
          google_maps_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          office_hours?: string | null
          phone_number?: string
          ppiu_license_number?: string | null
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
          whatsapp_number?: string
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          bank_names?: string[] | null
          company_legal_name?: string | null
          created_at?: string
          email?: string
          facebook_url?: string | null
          google_maps_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          office_hours?: string | null
          phone_number?: string
          ppiu_license_number?: string | null
          site_name?: string
          site_tagline?: string | null
          updated_at?: string
          whatsapp_number?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      whatsapp_clicks: {
        Row: {
          assigned_to: string | null
          assigned_to_email: string | null
          clicked_at: string
          cs_id: string | null
          cs_name: string
          id: string
          ip_hash: string | null
          message: string | null
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          clicked_at?: string
          cs_id?: string | null
          cs_name: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_email?: string | null
          clicked_at?: string
          cs_id?: string | null
          cs_name?: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_clicks_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_cs"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversions: {
        Row: {
          click_id: string | null
          converted_at: string
          created_by: string | null
          cs_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          package_name: string | null
        }
        Insert: {
          click_id?: string | null
          converted_at?: string
          created_by?: string | null
          cs_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          package_name?: string | null
        }
        Update: {
          click_id?: string | null
          converted_at?: string
          created_by?: string | null
          cs_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          package_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversions_cs_id_fkey"
            columns: ["cs_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_cs"
            referencedColumns: ["id"]
          },
        ]
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
          weight: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          phone_number: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string
          updated_at?: string
          weight?: number
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
      agent_leaderboard: {
        Row: {
          id: string | null
          level: string | null
          name: string | null
          total_commission: number | null
          total_sales: number | null
        }
        Insert: {
          id?: string | null
          level?: string | null
          name?: string | null
          total_commission?: number | null
          total_sales?: number | null
        }
        Update: {
          id?: string | null
          level?: string | null
          name?: string | null
          total_commission?: number | null
          total_sales?: number | null
        }
        Relationships: []
      }
      jamaah_registration_balances: {
        Row: {
          agreed_price: number | null
          due_date: string | null
          outstanding: number | null
          package_id: string | null
          paid_pending: number | null
          paid_verified: number | null
          registration_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_mark_payment_settled: {
        Args: { _admin_notes?: string; _order_id: string }
        Returns: undefined
      }
      cancel_booking: {
        Args: { _booking_id: string; _reason: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          _package_id: string
          _primary_contact_name: string
          _primary_contact_phone: string
          _referral_code?: string
          _room_type: string
          _traveler_count: number
        }
        Returns: string
      }
      create_booking_payment: {
        Args: { _amount: number; _booking_id: string }
        Returns: {
          order_id: string
          total_charged: number
        }[]
      }
      create_calculator_lead: { Args: { _lead: Json }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      accept_jamaah_intake: {
        Args: { _force?: boolean; _intake_id: string; _people: Json }
        Returns: Json
      }
      reject_jamaah_intake: {
        Args: { _intake_id: string; _reason: string }
        Returns: undefined
      }
      import_jamaah_rows: {
        Args: { _package_id: string; _rows: Json }
        Returns: number
      }
      list_agent_options: {
        Args: never
        Returns: {
          id: string
          name: string
          referral_code: string
          status: string
        }[]
      }
      get_analytics_summary: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_calculator_lead_by_token: {
        Args: { _token: string }
        Returns: {
          assigned_to: string | null
          assigned_to_email: string | null
          calculated_daily_target: number | null
          calculated_monthly_target: number | null
          companion_name: string | null
          created_at: string
          ctwa_clid: string | null
          daily_target: number | null
          event_id: string | null
          existing_savings: number
          fbclid: string | null
          id: string
          mode: string
          monthly_saving: number
          months_to_departure: number | null
          name: string
          pilgrim_count: number
          recommended_package_id: string | null
          recommended_tier: string | null
          referrer: string | null
          result_data: Json | null
          selected_package: string | null
          share_token: string
          status: string
          target_timeframe_months: number | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string
        }
        SetofOptions: {
          from: "*"
          to: "umroh_calculator_leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_agent_sale: {
        Args: {
          _agent_id: string
          _commission_amount: number
          _customer_name: string
          _customer_phone: string
          _departure_date?: string
          _notes?: string
          _package_id: string
          _package_name: string
          _sale_amount: number
          _status?: string
        }
        Returns: string
      }
      mark_refund_sent: { Args: { _booking_id: string }; Returns: undefined }
      record_booking_payment_failed: {
        Args: { _new_status: string; _order_id: string }
        Returns: undefined
      }
      record_booking_payment_settled: {
        Args: { _order_id: string }
        Returns: undefined
      }
      record_payment_va_details: {
        Args: {
          _bank: string
          _midtrans_transaction_id: string
          _order_id: string
          _va_number: string
        }
        Returns: undefined
      }
      redirect_agent_short_link: { Args: { _code: string }; Returns: string }
      release_expired_booking_holds: { Args: never; Returns: undefined }
      slugify: { Args: { text_input: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "superadmin"
        | "product_admin"
        | "content_admin"
        | "agent_admin"
        | "advertiser"
        | "sales"
        | "product_contributor"
        | "cs_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "superadmin",
        "product_admin",
        "content_admin",
        "agent_admin",
        "advertiser",
        "sales",
        "product_contributor",
        "cs_admin",
      ],
    },
  },
} as const
