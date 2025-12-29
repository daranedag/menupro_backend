// ============================================================================
// Servicio de Suscripciones Modulares
// Gestiona tiers, features, facturación y cambios en suscripciones
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database'
import {
  CreateSubscriptionDTO,
  AddFeatureDTO,
  RemoveFeatureDTO,
  ChangeTierDTO,
  SubscriptionWithPricing,
  TierWithFeatures,
  FeatureValidation,
  SubscriptionLimits,
  PricingBreakdown,
  InvoiceWithLineItems,
  AvailableFeatureForTier,
  Feature,
} from '../types/subscriptions'

export class SubscriptionService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ========================================================================
  // TIERS
  // ========================================================================

  /**
   * Obtiene todos los tiers activos con sus features
   */
  async getAllTiersWithFeatures(): Promise<TierWithFeatures[]> {
    const { data: tiers, error: tiersError } = await this.supabase
      .from('tiers')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (tiersError) throw tiersError

    const result: TierWithFeatures[] = []

    for (const tier of (tiers || []) as any[]) {
      const { data: features, error: featuresError } = await this.supabase
        .from('tier_available_features')
        .select('*')
        .eq('tier_id', tier.id)

      if (featuresError) throw featuresError

      result.push({
        tier_id: tier.id,
        tier_name: tier.name,
        tier_base_price: tier.base_price_monthly || 0,
        tier_description: tier.description || null,
        features:
          (features as any[])?.map((f) => ({
            feature_id: f.feature_id,
            feature_key: f.feature_key,
            feature_name: f.feature_name,
            feature_description: null,
            feature_category: '',
            base_price: f.feature_base_price,
            included_by_default: f.included_by_default,
            discount_percentage: f.discount_percentage,
            final_price: f.final_price,
          })) || [],
      })
    }

    return result
  }

  /**
   * Obtiene un tier específico por ID con sus features
   */
  async getTierById(tierId: number): Promise<TierWithFeatures | null> {
    const allTiers = await this.getAllTiersWithFeatures()
    return allTiers.find((t) => t.tier_id === tierId) || null
  }

  // ========================================================================
  // FEATURES
  // ========================================================================

  /**
   * Obtiene todas las features activas
   */
  async getAllFeatures(): Promise<Feature[]> {
    const { data, error } = await this.supabase
      .from('features')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return (data as Feature[]) || []
  }

  /**
   * Obtiene features disponibles para un tier específico
   */
  async getAvailableFeaturesForTier(tierId: number): Promise<AvailableFeatureForTier[]> {
    const { data, error } = await this.supabase
      .from('tier_available_features')
      .select('*')
      .eq('tier_id', tierId)

    if (error) throw error
    return (data as AvailableFeatureForTier[]) || []
  }

  /**
   * Valida si una feature puede agregarse a una suscripción
   */
  async validateFeatureAddition(
    subscriptionId: string,
    featureId: number
  ): Promise<FeatureValidation> {
    // Verificar si la feature ya está activa
    const { data: existingFeature, error: checkError } = await this.supabase
      .from('subscription_features')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('feature_id', featureId)
      .eq('is_active', true)
      .maybeSingle()

    if (checkError) throw checkError

    if (existingFeature) {
      return {
        can_add: false,
        reason: 'Esta feature ya está activa en la suscripción',
        estimated_price: 0,
      }
    }

    // Obtener el tier de la suscripción
    const { data: subscription, error: subError } = await this.supabase
      .from('restaurant_subscriptions')
      .select('tier_id')
      .eq('id', subscriptionId)
      .single()

    if (subError) throw subError

    // Obtener precio de la feature con descuento del tier
    const { data: featureInfo, error: featureError } = await this.supabase
      .from('tier_available_features')
      .select('*')
      .eq('tier_id', (subscription as any).tier_id)
      .eq('feature_id', featureId)
      .maybeSingle()

    if (featureError) throw featureError

    if (!featureInfo) {
      return {
        can_add: false,
        reason: 'Feature no disponible',
        estimated_price: 0,
      }
    }

    return {
      can_add: true,
      estimated_price: (featureInfo as any).final_price,
      discount_applied: (featureInfo as any).discount_percentage,
    }
  }

  // ========================================================================
  // SUSCRIPCIONES - CRUD
  // ========================================================================

  /**
   * Crea una nueva suscripción con tier y features opcionales
   */
  async createSubscription(dto: CreateSubscriptionDTO): Promise<string> {
    // Crear la suscripción base
    const { data: subscription, error: subError } = await (this.supabase
      .from('restaurant_subscriptions')
      .insert as any)({
        restaurant_id: dto.restaurant_id,
        tier_id: dto.tier_id,
        billing_cycle: dto.billing_cycle || 'monthly',
        active: true,
        started_at: new Date().toISOString(),
        next_billing_date: this.calculateNextBillingDate(dto.billing_cycle || 'monthly'),
      })
      .select('id')
      .single()

    if (subError) throw subError

    // Agregar features incluidas por defecto del tier
    const { data: includedFeatures, error: featuresError } = await this.supabase
      .from('tier_features')
      .select('feature_id')
      .eq('tier_id', dto.tier_id)
      .eq('included_by_default', true)

    if (featuresError) throw featuresError

    if (includedFeatures && includedFeatures.length > 0) {
      for (const tf of includedFeatures as any[]) {
        await this.addFeature({
          subscription_id: (subscription as any).id,
          feature_id: tf.feature_id,
          prorated: false,
        })
      }
    }

    // Agregar features adicionales si las hay
    if (dto.feature_ids && dto.feature_ids.length > 0) {
      for (const featureId of dto.feature_ids) {
        await this.addFeature({
          subscription_id: (subscription as any).id,
          feature_id: featureId,
          prorated: false,
        })
      }
    }

    return (subscription as any).id
  }

  /**
   * Obtiene una suscripción con toda su información de pricing
   */
  async getSubscriptionWithPricing(subscriptionId: string): Promise<SubscriptionWithPricing | null> {
    const { data, error } = await this.supabase
      .from('subscriptions_with_pricing')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .maybeSingle()

    if (error) throw error
    return data as SubscriptionWithPricing | null
  }

  /**
   * Obtiene todas las suscripciones de un restaurante
   */
  async getRestaurantSubscriptions(restaurantId: string): Promise<SubscriptionWithPricing[]> {
    const { data, error } = await this.supabase
      .from('subscriptions_with_pricing')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return (data as SubscriptionWithPricing[]) || []
  }

  /**
   * Obtiene la suscripción activa de un restaurante
   */
  async getActiveSubscription(restaurantId: string): Promise<SubscriptionWithPricing | null> {
    const { data, error } = await this.supabase
      .from('subscriptions_with_pricing')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    return data as SubscriptionWithPricing | null
  }

  // ========================================================================
  // FEATURES - Agregar/Remover
  // ========================================================================

  /**
   * Agrega una feature a una suscripción
   */
  async addFeature(dto: AddFeatureDTO): Promise<string> {
    const { data, error } = await (this.supabase.rpc as any)('add_feature_to_subscription', {
      p_subscription_id: dto.subscription_id,
      p_feature_id: dto.feature_id,
      p_prorated: dto.prorated ?? false,
    })

    if (error) throw error
    return data as string
  }

  /**
   * Remueve una feature de una suscripción
   */
  async removeFeature(dto: RemoveFeatureDTO): Promise<void> {
    const { error } = await (this.supabase.rpc as any)('remove_feature_from_subscription', {
      p_subscription_id: dto.subscription_id,
      p_feature_id: dto.feature_id,
      p_prorated: dto.prorated ?? true,
    })

    if (error) throw error
  }

  /**
   * Obtiene las features activas de una suscripción
   */
  async getSubscriptionFeatures(subscriptionId: string) {
    const { data, error } = await this.supabase
      .from('subscription_features')
      .select(
        `
        *,
        feature:features(*)
      `
      )
      .eq('subscription_id', subscriptionId)
      .eq('is_active', true)

    if (error) throw error
    return data || []
  }

  // ========================================================================
  // TIER - Cambio
  // ========================================================================

  /**
   * Cambia el tier de una suscripción
   */
  async changeTier(dto: ChangeTierDTO): Promise<void> {
    const { error } = await (this.supabase.rpc as any)('change_subscription_tier', {
      p_subscription_id: dto.subscription_id,
      p_new_tier_id: dto.new_tier_id,
      p_prorated: dto.prorated ?? true,
    })

    if (error) throw error
  }

  // ========================================================================
  // PRICING Y LÍMITES
  // ========================================================================

  /**
   * Calcula el precio total de una suscripción
   */
  async calculateSubscriptionPrice(subscriptionId: string): Promise<number> {
    const { data, error } = await (this.supabase.rpc as any)('calculate_subscription_total_price', {
      p_subscription_id: subscriptionId,
    })

    if (error) throw error
    return data as number
  }

  /**
   * Obtiene un desglose detallado del pricing
   */
  async getPricingBreakdown(subscriptionId: string): Promise<PricingBreakdown> {
    const subscription = await this.getSubscriptionWithPricing(subscriptionId)
    if (!subscription) throw new Error('Suscripción no encontrada')

    const features = subscription.active_features || []

    const tierBasePrice = subscription.tier_base_price
    const featuresTotal = features.reduce((sum, f) => sum + f.price, 0)
    const additionalMenusCost = 0 // TODO: Calcular menús adicionales
    const subtotal = tierBasePrice + featuresTotal + additionalMenusCost
    const tax = subtotal * 0 // Ajustar según tu país
    const total = subtotal + tax

    return {
      tier_base_price: tierBasePrice,
      features_total: featuresTotal,
      additional_menus_cost: additionalMenusCost,
      subtotal,
      tax,
      total,
      features_detail: features.map((f) => ({
        feature_name: f.feature_name,
        price: f.price,
      })),
    }
  }

  /**
   * Obtiene los límites y capacidades de una suscripción
   */
  async getSubscriptionLimits(subscriptionId: string): Promise<SubscriptionLimits> {
    const subscription = await this.getSubscriptionWithPricing(subscriptionId)
    if (!subscription) throw new Error('Suscripción no encontrada')

    // Obtener tier info
    const { data: tier, error: tierError } = await this.supabase
      .from('tiers')
      .select('*')
      .eq('id', subscription.tier_id)
      .single()

    if (tierError) throw tierError

    // Contar menús actuales
    const { count: menuCount, error: menuError } = await this.supabase
      .from('menus')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', subscription.restaurant_id)

    if (menuError) throw menuError

    const currentMenus = menuCount || 0
    const maxMenus = (tier as any).max_menus
    const canCreateMore = maxMenus === -1 || currentMenus < maxMenus

    return {
      max_menus: maxMenus,
      current_menus: currentMenus,
      can_create_more: canCreateMore,
      additional_menu_price: (tier as any).price_per_additional_menu || 0,
      allows_pdf: (tier as any).allows_pdf,
      allows_custom_fonts: (tier as any).allows_custom_fonts,
      allows_images: (tier as any).allows_images,
      allows_multiple_locations: (tier as any).allows_multiple_locations,
    }
  }

  // ========================================================================
  // FACTURACIÓN
  // ========================================================================

  /**
   * Genera una factura para un período
   */
  async generateInvoice(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string> {
    const { data, error } = await (this.supabase.rpc as any)('generate_invoice', {
      p_subscription_id: subscriptionId,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    })

    if (error) throw error
    return data as string
  }

  /**
   * Obtiene una factura con sus líneas
   */
  async getInvoiceWithLineItems(invoiceId: string): Promise<InvoiceWithLineItems | null> {
    const { data: invoice, error: invoiceError } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    const { data: lineItems, error: itemsError } = await this.supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    if (itemsError) throw itemsError

    return {
      ...(invoice as any),
      line_items: (lineItems as any[]) || [],
    } as InvoiceWithLineItems
  }

  /**
   * Obtiene todas las facturas de una suscripción
   */
  async getSubscriptionInvoices(subscriptionId: string): Promise<InvoiceWithLineItems[]> {
    const { data: invoices, error: invoicesError } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('period_start', { ascending: false })

    if (invoicesError) throw invoicesError

    const result: InvoiceWithLineItems[] = []

    for (const invoice of (invoices || []) as any[]) {
      const { data: lineItems, error: itemsError } = await this.supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id)

      if (itemsError) throw itemsError

      result.push({
        ...(invoice as any),
        line_items: (lineItems as any[]) || [],
      } as InvoiceWithLineItems)
    }

    return result
  }

  /**
   * Marca una factura como pagada
   */
  async markInvoiceAsPaid(
    invoiceId: string,
    paymentMethod: string,
    paymentMetadata?: Record<string, any>
  ): Promise<void> {
    const { error } = await (this.supabase
      .from('invoices')
      .update as any)({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        payment_metadata: paymentMetadata || null,
      })
      .eq('id', invoiceId)

    if (error) throw error
  }

  // ========================================================================
  // CANCELACIÓN Y RENOVACIÓN
  // ========================================================================

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const { error } = await (this.supabase
      .from('restaurant_subscriptions')
      .update as any)({
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq('id', subscriptionId)

    if (error) throw error

    // Registrar en historial
    await (this.supabase.from('subscription_changes').insert as any)({
      subscription_id: subscriptionId,
      change_type: 'cancellation',
      notes: reason || 'Usuario canceló la suscripción',
    })
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    const { error } = await (this.supabase
      .from('restaurant_subscriptions')
      .update as any)({
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
      })
      .eq('id', subscriptionId)

    if (error) throw error
  }

  // ========================================================================
  // HISTORIAL
  // ========================================================================

  /**
   * Obtiene el historial de cambios de una suscripción
   */
  async getSubscriptionHistory(subscriptionId: string) {
    const { data, error } = await this.supabase
      .from('subscription_changes')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ========================================================================
  // UTILIDADES PRIVADAS
  // ========================================================================

  private calculateNextBillingDate(billingCycle: 'monthly' | 'annual'): string {
    const now = new Date()
    if (billingCycle === 'monthly') {
      now.setMonth(now.getMonth() + 1)
    } else {
      now.setFullYear(now.getFullYear() + 1)
    }
    return now.toISOString()
  }
}
