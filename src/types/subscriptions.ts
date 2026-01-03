// ============================================================================
// Tipos extendidos para el sistema modular de suscripciones
// ============================================================================

import { Database } from './database'

// Extender los tipos de la base de datos con las nuevas tablas
export interface Feature {
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

export interface TierFeature {
  id: number
  tier_id: number
  feature_id: number
  included_by_default: boolean
  discount_percentage: number
  created_at: string
}

export interface SubscriptionFeature {
  id: string
  subscription_id: string
  feature_id: number
  added_at: string
  removed_at: string | null
  price_at_purchase: number
  is_active: boolean
  created_at: string
}

export interface SubscriptionChange {
  id: string
  subscription_id: string
  change_type: 'tier_change' | 'feature_added' | 'feature_removed' | 'renewal' | 'cancellation'
  previous_value: Record<string, any> | null
  new_value: Record<string, any> | null
  amount_adjustment: number
  prorated_amount: number
  notes: string | null
  created_at: string
}

export interface Invoice {
  id: string
  subscription_id: string
  invoice_number: string
  period_start: string
  period_end: string
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'
  paid_at: string | null
  due_date: string
  payment_method: string | null
  payment_metadata: Record<string, any> | null
  created_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  item_type: 'tier_base' | 'feature' | 'additional_menu' | 'adjustment' | 'tax' | 'discount'
  quantity: number
  unit_price: number
  total: number
  metadata: Record<string, any> | null
  created_at: string
}

// DTOs para las operaciones

export interface CreateSubscriptionDTO {
  restaurant_id: string
  tier_id: number
  billing_cycle?: 'monthly' | 'annual'
  feature_ids?: number[] // Features adicionales a agregar
}

export interface AddFeatureDTO {
  subscription_id: string
  feature_id: number
  prorated?: boolean
}

export interface RemoveFeatureDTO {
  subscription_id: string
  feature_id: number
  prorated?: boolean
}

export interface ChangeTierDTO {
  subscription_id: string
  new_tier_id: number
  prorated?: boolean
}

// Respuestas enriquecidas

export interface SubscriptionWithPricing {
  subscription_id: string
  restaurant_id: string
  restaurant_name: string
  tier_id: number
  tier_name: string
  tier_base_price: number
  billing_cycle: 'monthly' | 'annual'
  started_at: string
  expires_at: string | null
  next_billing_date: string | null
  active: boolean
  auto_renew: boolean
  monthly_total: number
  active_features_count: number
  active_features: Array<{
    feature_id: number
    feature_key: string
    feature_name: string
    price: number
  }> | null
}

export interface TierWithFeatures {
  tier_id: number
  tier_name: string
  tier_base_price: number
  max_menus: number
  max_restaurants?: number
  tier_description: string | null
  features: Array<{
    feature_id: number
    feature_key: string
    feature_name: string
    feature_description: string | null
    feature_category: string
    base_price: number
    included_by_default: boolean
    discount_percentage: number
    final_price: number
  }>
}

export interface AvailableFeatureForTier {
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

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[]
}

// Tipos para validaciones y reglas de negocio

export interface FeatureValidation {
  can_add: boolean
  reason?: string
  estimated_price: number
  discount_applied?: number
}

export interface SubscriptionLimits {
  max_menus: number
  current_menus: number
  can_create_more: boolean
  additional_menu_price: number
  allows_pdf: boolean
  allows_custom_fonts: boolean
  allows_images: boolean
  allows_multiple_locations: boolean
}

export interface PricingBreakdown {
  tier_base_price: number
  features_total: number
  additional_menus_cost: number
  subtotal: number
  tax: number
  total: number
  features_detail: Array<{
    feature_name: string
    price: number
  }>
}

// Eventos del sistema de suscripciones (para webhooks internos)

export type SubscriptionEvent =
  | {
      type: 'subscription.created'
      data: { subscription_id: string; tier_id: number }
    }
  | {
      type: 'subscription.tier_changed'
      data: { subscription_id: string; old_tier_id: number; new_tier_id: number }
    }
  | {
      type: 'subscription.feature_added'
      data: { subscription_id: string; feature_id: number; price: number }
    }
  | {
      type: 'subscription.feature_removed'
      data: { subscription_id: string; feature_id: number; refund_amount: number }
    }
  | {
      type: 'subscription.cancelled'
      data: { subscription_id: string; cancellation_reason?: string }
    }
  | {
      type: 'invoice.generated'
      data: { invoice_id: string; subscription_id: string; total: number }
    }
  | {
      type: 'invoice.paid'
      data: { invoice_id: string; payment_method: string }
    }
  | {
      type: 'invoice.overdue'
      data: { invoice_id: string; days_overdue: number }
    }

// Configuración de features por categoría

export interface FeatureCategory {
  key: string
  name: string
  description: string
  icon?: string
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { key: 'design', name: 'Diseño', description: 'Personalización visual de tus menús' },
  { key: 'content', name: 'Contenido', description: 'Funcionalidades para enriquecer tus platos' },
  { key: 'analytics', name: 'Analíticas', description: 'Insights y reportes de rendimiento' },
  { key: 'integrations', name: 'Integraciones', description: 'Conecta con otros sistemas' },
  { key: 'locations', name: 'Ubicaciones', description: 'Gestión de sucursales y cadenas' },
  { key: 'support', name: 'Soporte', description: 'Atención y ayuda personalizada' },
]

// Helper types para queries

export type FeatureWithTierInfo = Feature & {
  tier_features?: TierFeature[]
}

export type SubscriptionWithDetails = Database['public']['Tables']['restaurant_subscriptions']['Row'] & {
  tier?: Database['public']['Tables']['tiers']['Row']
  features?: (SubscriptionFeature & { feature?: Feature })[]
  restaurant?: Database['public']['Tables']['restaurants']['Row']
}

// Constantes útiles

export const BILLING_CYCLES = {
  MONTHLY: 'monthly' as const,
  ANNUAL: 'annual' as const,
}

export const INVOICE_STATUSES = {
  PENDING: 'pending' as const,
  PAID: 'paid' as const,
  OVERDUE: 'overdue' as const,
  CANCELLED: 'cancelled' as const,
  REFUNDED: 'refunded' as const,
}

export const CHANGE_TYPES = {
  TIER_CHANGE: 'tier_change' as const,
  FEATURE_ADDED: 'feature_added' as const,
  FEATURE_REMOVED: 'feature_removed' as const,
  RENEWAL: 'renewal' as const,
  CANCELLATION: 'cancellation' as const,
}

// Configuración de tiers recomendada

export interface TierConfig {
  id: number
  name: string
  displayName: string
  description: string
  basePrice: number
  recommended?: boolean
  features: {
    included: string[] // Keys de features incluidas
    highlighted: string[] // Features a destacar en UI
  }
  limits: {
    maxMenus: number
    pricePerAdditionalMenu: number
  }
}

export const DEFAULT_TIERS: Omit<TierConfig, 'id'>[] = [
  {
    name: 'free',
    displayName: 'Gratis',
    description: 'Perfecto para comenzar',
    basePrice: 0,
    features: {
      included: [],
      highlighted: ['1 menú', 'QR code', 'Diseño básico'],
    },
    limits: {
      maxMenus: 1,
      pricePerAdditionalMenu: 0,
    },
  },
  {
    name: 'basic',
    displayName: 'Básico',
    description: 'Para restaurantes pequeños',
    basePrice: 9.99,
    recommended: false,
    features: {
      included: ['basic_analytics', 'allergen_info'],
      highlighted: ['1 menú', 'Analíticas básicas', 'Info de alérgenos', '20% descuento en features'],
    },
    limits: {
      maxMenus: 1,
      pricePerAdditionalMenu: 0,
    },
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'Para negocios en crecimiento',
    basePrice: 29.99,
    recommended: true,
    features: {
      included: [
        'pdf_export',
        'custom_fonts',
        'unlimited_images',
        'basic_analytics',
        'allergen_info',
        'nutritional_info',
      ],
      highlighted: [
        'Hasta 5 menús',
        'PDF profesional',
        'Fuentes personalizadas',
        'Imágenes ilimitadas',
        '30% descuento en features avanzadas',
      ],
    },
    limits: {
      maxMenus: 5,
      pricePerAdditionalMenu: 0,
    },
  },
]
