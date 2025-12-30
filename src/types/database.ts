// Tipos generados desde la base de datos de Supabase
// Para generar automáticamente: npx supabase gen types typescript --project-id "your-project-ref" > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string | null
          role: 'platform_admin' | 'restaurant_owner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role?: 'platform_admin' | 'restaurant_owner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'platform_admin' | 'restaurant_owner'
          created_at?: string
          updated_at?: string
        }
      }
      tiers: {
        Row: {
          id: number
          name: string
          max_menus: number
          price_per_additional_menu: number
          customization_level: number
          allows_pdf: boolean
          allows_custom_fonts: boolean
          allows_images: boolean
          allows_multiple_locations: boolean
          base_price_monthly: number
          billing_cycle: string
          active: boolean
          sort_order: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          max_menus: number
          price_per_additional_menu?: number
          customization_level: number
          allows_pdf?: boolean
          allows_custom_fonts?: boolean
          allows_images?: boolean
          allows_multiple_locations?: boolean
          base_price_monthly?: number
          billing_cycle?: string
          active?: boolean
          sort_order?: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          max_menus?: number
          price_per_additional_menu?: number
          customization_level?: number
          allows_pdf?: boolean
          allows_custom_fonts?: boolean
          allows_images?: boolean
          allows_multiple_locations?: boolean
          base_price_monthly?: number
          billing_cycle?: string
          active?: boolean
          sort_order?: number
          description?: string | null
          created_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          owner_id: string
          parent_restaurant_id: string | null
          name: string
          slug: string
          location_name: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          phone: string | null
          address: string | null
          city: string | null
          country: string | null
          currency: string
          timezone: string
          contact_email: string | null
          website: string | null
          instagram: string | null
          facebook: string | null
          last_accessed_at: string | null
          active: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          parent_restaurant_id?: string | null
          name: string
          slug: string
          location_name?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          currency?: string
          timezone?: string
          contact_email?: string | null
          website?: string | null
          instagram?: string | null
          facebook?: string | null
          last_accessed_at?: string | null
          active?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          parent_restaurant_id?: string | null
          name?: string
          slug?: string
          location_name?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          currency?: string
          timezone?: string
          contact_email?: string | null
          website?: string | null
          instagram?: string | null
          facebook?: string | null
          last_accessed_at?: string | null
          active?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      restaurant_subscriptions: {
        Row: {
          id: string
          restaurant_id: string
          tier_id: number
          started_at: string
          expires_at: string | null
          active: boolean
          billing_cycle: string
          next_billing_date: string | null
          auto_renew: boolean
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          tier_id: number
          started_at?: string
          expires_at?: string | null
          active?: boolean
          billing_cycle?: string
          next_billing_date?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          tier_id?: number
          started_at?: string
          expires_at?: string | null
          active?: boolean
          billing_cycle?: string
          next_billing_date?: string | null
          auto_renew?: boolean
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menus: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          slug: string
          description: string | null
          is_published: boolean
          published_at: string | null
          qr_code_url: string | null
          view_count: number
          last_viewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          slug: string
          description?: string | null
          is_published?: boolean
          published_at?: string | null
          qr_code_url?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          slug?: string
          description?: string | null
          is_published?: boolean
          published_at?: string | null
          qr_code_url?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menu_sections: {
        Row: {
          id: string
          menu_id: string
          name: string
          description: string | null
          order_index: number
          discount_type: 'none' | 'percentage' | 'fixed'
          discount_value: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          name: string
          description?: string | null
          order_index: number
          discount_type?: 'none' | 'percentage' | 'fixed'
          discount_value?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_id?: string
          name?: string
          description?: string | null
          order_index?: number
          discount_type?: 'none' | 'percentage' | 'fixed'
          discount_value?: number
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          section_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          discount_type: 'none' | 'percentage' | 'fixed'
          discount_value: number
          available: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          discount_type?: 'none' | 'percentage' | 'fixed'
          discount_value?: number
          available?: boolean
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          section_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          discount_type?: 'none' | 'percentage' | 'fixed'
          discount_value?: number
          available?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      features: {
        Row: {
          id: number
          key: string
          name: string
          description: string | null
          category: string
          base_price: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          key: string
          name: string
          description?: string | null
          category: string
          base_price?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          key?: string
          name?: string
          description?: string | null
          category?: string
          base_price?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tier_features: {
        Row: {
          id: number
          tier_id: number
          feature_id: number
          included_by_default: boolean
          discount_percentage: number
          created_at: string
        }
        Insert: {
          id?: number
          tier_id: number
          feature_id: number
          included_by_default?: boolean
          discount_percentage?: number
          created_at?: string
        }
        Update: {
          id?: number
          tier_id?: number
          feature_id?: number
          included_by_default?: boolean
          discount_percentage?: number
          created_at?: string
        }
      }
      subscription_features: {
        Row: {
          id: string
          subscription_id: string
          feature_id: number
          added_at: string
          removed_at: string | null
          price_at_purchase: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          feature_id: number
          added_at?: string
          removed_at?: string | null
          price_at_purchase: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          feature_id?: number
          added_at?: string
          removed_at?: string | null
          price_at_purchase?: number
          is_active?: boolean
          created_at?: string
        }
      }
      subscription_changes: {
        Row: {
          id: string
          subscription_id: string
          change_type: string
          previous_value: Json | null
          new_value: Json | null
          amount_adjustment: number
          prorated_amount: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          change_type: string
          previous_value?: Json | null
          new_value?: Json | null
          amount_adjustment?: number
          prorated_amount?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          change_type?: string
          previous_value?: Json | null
          new_value?: Json | null
          amount_adjustment?: number
          prorated_amount?: number
          notes?: string | null
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          subscription_id: string
          invoice_number: string
          period_start: string
          period_end: string
          subtotal: number
          tax: number
          total: number
          status: string
          paid_at: string | null
          due_date: string
          payment_method: string | null
          payment_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          invoice_number: string
          period_start: string
          period_end: string
          subtotal?: number
          tax?: number
          total: number
          status?: string
          paid_at?: string | null
          due_date: string
          payment_method?: string | null
          payment_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          invoice_number?: string
          period_start?: string
          period_end?: string
          subtotal?: number
          tax?: number
          total?: number
          status?: string
          paid_at?: string | null
          due_date?: string
          payment_method?: string | null
          payment_metadata?: Json | null
          created_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          item_type: string
          quantity: number
          unit_price: number
          total: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          item_type: string
          quantity?: number
          unit_price: number
          total: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          item_type?: string
          quantity?: number
          unit_price?: number
          total?: number
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      active_subscriptions: {
        Row: {
          id: string
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          tier_id: number
          tier_name: string
          max_menus: number
          price_per_additional_menu: number
          customization_level: number
          allows_pdf: boolean
          allows_custom_fonts: boolean
          allows_images: boolean
          allows_multiple_locations: boolean
          started_at: string
          expires_at: string | null
          is_valid: boolean
        }
      }
      subscriptions_with_pricing: {
        Row: {
          subscription_id: string
          restaurant_id: string
          restaurant_name: string
          tier_id: number
          tier_name: string
          tier_base_price: number
          billing_cycle: string
          started_at: string
          expires_at: string | null
          next_billing_date: string | null
          active: boolean
          auto_renew: boolean
          monthly_total: number
          active_features_count: number
          active_features: Json | null
        }
      }
      tier_available_features: {
        Row: {
          tier_id: number
          tier_name: string
          feature_id: number
          feature_key: string
          feature_name: string
          feature_base_price: number
          included_by_default: boolean
          discount_percentage: number
          final_price: number
        }
      }
      menus_with_restaurant: {
        Row: {
          id: string
          menu_name: string
          menu_slug: string
          description: string | null
          is_published: boolean
          published_at: string | null
          qr_code_url: string | null
          view_count: number
          last_viewed_at: string | null
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      check_menu_limit: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      calculate_subscription_cost: {
        Args: { p_restaurant_id: string }
        Returns: number
      }
      calculate_subscription_total_price: {
        Args: { p_subscription_id: string }
        Returns: number
      }
      add_feature_to_subscription: {
        Args: { p_subscription_id: string; p_feature_id: number; p_prorated: boolean }
        Returns: string
      }
      remove_feature_from_subscription: {
        Args: { p_subscription_id: string; p_feature_id: number; p_prorated: boolean }
        Returns: void
      }
      change_subscription_tier: {
        Args: { p_subscription_id: string; p_new_tier_id: number; p_prorated: boolean }
        Returns: void
      }
      generate_invoice: {
        Args: { p_subscription_id: string; p_period_start: string; p_period_end: string }
        Returns: string
      }
      get_chain_locations: {
        Args: { p_parent_restaurant_id: string }
        Returns: {
          id: string
          name: string
          location_name: string | null
          city: string | null
          address: string | null
          menu_count: number
        }[]
      }
      get_chain_total_menus: {
        Args: { p_parent_restaurant_id: string }
        Returns: number
      }
    }
    Enums: {
      user_role: 'platform_admin' | 'restaurant_owner'
      discount_type: 'none' | 'percentage' | 'fixed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
