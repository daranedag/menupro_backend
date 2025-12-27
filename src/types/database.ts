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
          role: 'platform_admin' | 'restaurant_owner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'platform_admin' | 'restaurant_owner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
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
          timezone: string
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
          timezone?: string
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
          timezone?: string
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
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          tier_id: number
          started_at?: string
          expires_at?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          tier_id?: number
          started_at?: string
          expires_at?: string | null
          active?: boolean
          created_at?: string
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
  }
}
