/**
 * EJEMPLOS DE USO - Sistema de Suscripciones Modulares
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar el sistema
 * de suscripciones en diferentes escenarios.
 */

import { SubscriptionService } from '../services/subscriptions.service'
import { supabase } from '../config/supabase'

const subscriptionService = new SubscriptionService(supabase)

// ============================================================================
// EJEMPLO 1: Onboarding de un nuevo restaurante
// ============================================================================

async function example1_newRestaurantOnboarding() {
  console.log('=== EJEMPLO 1: Onboarding de nuevo restaurante ===\n')

  const restaurantId = 'uuid-del-restaurante' // Obtenido después de crear el restaurante

  // Paso 1: Mostrar planes disponibles al cliente
  console.log('📋 Obteniendo planes disponibles...')
  const tiers = await subscriptionService.getAllTiersWithFeatures()

  console.log('\nPlanes disponibles:')
  tiers.forEach((tier) => {
    console.log(`\n${tier.tier_name.toUpperCase()} - $${tier.tier_base_price}/mes`)
    console.log(`Features incluidas: ${tier.features.filter((f) => f.included_by_default).length}`)
    console.log(
      `Features opcionales: ${tier.features.filter((f) => !f.included_by_default).length}`
    )
  })

  // Paso 2: Cliente selecciona plan "Basic"
  console.log('\n\n✅ Cliente selecciona plan BASIC')

  const subscriptionId = await subscriptionService.createSubscription({
    restaurant_id: restaurantId,
    tier_id: 2, // Basic
    billing_cycle: 'monthly',
  })

  console.log(`Suscripción creada: ${subscriptionId}`)

  // Paso 3: Ver resumen de la suscripción
  const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  console.log('\n📊 Resumen de suscripción:')
  console.log(`- Tier: ${subscription?.tier_name}`)
  console.log(`- Precio base: $${subscription?.tier_base_price}`)
  console.log(`- Features activas: ${subscription?.active_features_count}`)
  console.log(`- Total mensual: $${subscription?.monthly_total}`)
}

// ============================================================================
// EJEMPLO 2: Cliente agrega features modulares
// ============================================================================

async function example2_addModularFeatures() {
  console.log('\n\n=== EJEMPLO 2: Agregar features modulares ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  // Paso 1: Ver features disponibles para mi tier
  const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  const availableFeatures = await subscriptionService.getAvailableFeaturesForTier(
    subscription!.tier_id
  )

  console.log('🎨 Features disponibles para agregar:')
  availableFeatures
    .filter((f) => !f.included_by_default)
    .forEach((feature) => {
      const discount = feature.discount_percentage > 0 ? ` (${feature.discount_percentage}% off)` : ''
      console.log(`- ${feature.feature_name}: $${feature.final_price}${discount}`)
    })

  // Paso 2: Cliente quiere "Exportación a PDF"
  const pdfFeatureId = 1
  console.log('\n\n📄 Cliente selecciona "Exportación a PDF"')

  // Validar primero
  const validation = await subscriptionService.validateFeatureAddition(
    subscriptionId,
    pdfFeatureId
  )

  if (!validation.can_add) {
    console.log(`❌ No se puede agregar: ${validation.reason}`)
    return
  }

  console.log(`✅ Precio con descuento: $${validation.estimated_price}`)

  // Agregar la feature
  await subscriptionService.addFeature({
    subscription_id: subscriptionId,
    feature_id: pdfFeatureId,
    prorated: false, // Cobrar desde el siguiente ciclo
  })

  // Ver nuevo total
  const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  console.log(`\n💰 Nuevo total mensual: $${updatedSubscription?.monthly_total}`)
}

// ============================================================================
// EJEMPLO 3: Upgrade de tier (Basic → Pro)
// ============================================================================

async function example3_upgradeTier() {
  console.log('\n\n=== EJEMPLO 3: Upgrade de tier ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  // Estado actual
  const currentSub = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  console.log('📊 Estado actual:')
  console.log(`- Tier: ${currentSub?.tier_name}`)
  console.log(`- Total: $${currentSub?.monthly_total}`)
  console.log(`- Features activas: ${currentSub?.active_features_count}`)

  // Cliente quiere upgrade a Pro
  console.log('\n\n⬆️ Upgrading a PRO...')

  await subscriptionService.changeTier({
    subscription_id: subscriptionId,
    new_tier_id: 3, // Pro
    prorated: true, // Calcular ajuste proporcional
  })

  // Nuevo estado
  const newSub = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  console.log('\n✅ Upgrade completado:')
  console.log(`- Nuevo tier: ${newSub?.tier_name}`)
  console.log(`- Nuevo total: $${newSub?.monthly_total}`)
  console.log(`- Features activas: ${newSub?.active_features_count}`)

  // Ver qué features ahora son gratis
  console.log('\n🎁 Features que ahora están incluidas:')
  newSub?.active_features?.forEach((feature) => {
    if (feature.price === 0) {
      console.log(`- ${feature.feature_name}`)
    }
  })
}

// ============================================================================
// EJEMPLO 4: Cliente remueve una feature
// ============================================================================

async function example4_removeFeature() {
  console.log('\n\n=== EJEMPLO 4: Remover feature ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'
  const featureToRemove = 5 // unlimited_images

  // Ver pricing antes
  const before = await subscriptionService.getPricingBreakdown(subscriptionId)
  console.log('💰 Antes:')
  console.log(`- Tier base: $${before.tier_base_price}`)
  console.log(`- Features: $${before.features_total}`)
  console.log(`- Total: $${before.total}`)

  console.log('\n\n🗑️ Removiendo "Imágenes ilimitadas"...')

  await subscriptionService.removeFeature({
    subscription_id: subscriptionId,
    feature_id: featureToRemove,
    prorated: true, // Reembolsar proporcionalmente
  })

  // Ver pricing después
  const after = await subscriptionService.getPricingBreakdown(subscriptionId)
  console.log('\n✅ Después:')
  console.log(`- Tier base: $${after.tier_base_price}`)
  console.log(`- Features: $${after.features_total}`)
  console.log(`- Total: $${after.total}`)
  console.log(`\n💵 Ahorro: $${(before.total - after.total).toFixed(2)}/mes`)
}

// ============================================================================
// EJEMPLO 5: Ver límites y capacidades
// ============================================================================

async function example5_checkLimits() {
  console.log('\n\n=== EJEMPLO 5: Verificar límites ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  const limits = await subscriptionService.getSubscriptionLimits(subscriptionId)

  console.log('🔒 Límites de tu plan:')
  console.log(`- Menús permitidos: ${limits.max_menus === -1 ? 'Ilimitados' : limits.max_menus}`)
  console.log(`- Menús creados: ${limits.current_menus}`)
  console.log(`- Puedes crear más: ${limits.can_create_more ? 'Sí' : 'No'}`)
  console.log(`\n🎨 Capacidades:`)
  console.log(`- PDF: ${limits.allows_pdf ? '✅' : '❌'}`)
  console.log(`- Fuentes personalizadas: ${limits.allows_custom_fonts ? '✅' : '❌'}`)
  console.log(`- Imágenes: ${limits.allows_images ? '✅' : '❌'}`)
  console.log(`- Múltiples ubicaciones: ${limits.allows_multiple_locations ? '✅' : '❌'}`)

  // Ejemplo: Validar antes de permitir subir imagen
  if (!limits.allows_images) {
    console.log('\n⚠️ Tu plan no permite imágenes. Considera un upgrade.')
  }
}

// ============================================================================
// EJEMPLO 6: Facturación mensual (Cron Job)
// ============================================================================

async function example6_monthlyBilling() {
  console.log('\n\n=== EJEMPLO 6: Facturación mensual ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  // Determinar período (normalmente lo calculas basándote en next_billing_date)
  const periodStart = new Date('2025-01-01')
  const periodEnd = new Date('2025-02-01')

  console.log(`📅 Generando factura para período:`)
  console.log(`  Desde: ${periodStart.toLocaleDateString()}`)
  console.log(`  Hasta: ${periodEnd.toLocaleDateString()}`)

  // Generar factura
  const invoiceId = await subscriptionService.generateInvoice(
    subscriptionId,
    periodStart,
    periodEnd
  )

  console.log(`\n✅ Factura generada: ${invoiceId}`)

  // Ver detalles
  const invoice = await subscriptionService.getInvoiceWithLineItems(invoiceId)
  console.log('\n📄 Detalles de la factura:')
  console.log(`- Número: ${invoice?.invoice_number}`)
  console.log(`- Subtotal: $${invoice?.subtotal}`)
  console.log(`- Impuestos: $${invoice?.tax}`)
  console.log(`- Total: $${invoice?.total}`)
  console.log(`- Estado: ${invoice?.status}`)
  console.log(`- Vencimiento: ${invoice?.due_date}`)

  console.log('\n📋 Líneas de factura:')
  invoice?.line_items.forEach((item) => {
    console.log(`- ${item.description}: $${item.total}`)
  })

  // Simular pago
  console.log('\n\n💳 Procesando pago...')
  await subscriptionService.markInvoiceAsPaid(invoiceId, 'stripe', {
    stripe_invoice_id: 'in_1234567890',
    stripe_charge_id: 'ch_1234567890',
  })

  console.log('✅ Pago registrado exitosamente')
}

// ============================================================================
// EJEMPLO 7: Cancelación de suscripción
// ============================================================================

async function example7_cancelSubscription() {
  console.log('\n\n=== EJEMPLO 7: Cancelar suscripción ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  console.log('❌ Cliente solicita cancelación...')

  await subscriptionService.cancelSubscription(
    subscriptionId,
    'Muy caro para mis necesidades actuales'
  )

  const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
  console.log('\n✅ Suscripción cancelada')
  console.log(`- Auto-renovación: ${subscription?.auto_renew ? 'Activa' : 'Desactivada'}`)
  console.log('- El servicio estará disponible hasta la fecha de vencimiento')
  console.log('- No se generarán más cargos')
}

// ============================================================================
// EJEMPLO 8: Historial de cambios
// ============================================================================

async function example8_viewHistory() {
  console.log('\n\n=== EJEMPLO 8: Ver historial ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  const history = await subscriptionService.getSubscriptionHistory(subscriptionId)

  console.log(`📜 Historial de cambios (${history.length} eventos):`)
  history.forEach((change: any) => {
    const date = new Date(change.created_at).toLocaleDateString()
    let description = ''

    switch (change.change_type) {
      case 'feature_added':
        description = `Agregó feature (ID: ${change.new_value.feature_id})`
        break
      case 'feature_removed':
        description = `Removió feature (ID: ${change.previous_value.feature_id})`
        break
      case 'tier_change':
        description = `Cambió de tier ${change.previous_value.tier_id} → ${change.new_value.tier_id}`
        break
      case 'cancellation':
        description = 'Canceló la suscripción'
        break
      default:
        description = change.change_type
    }

    const adjustment =
      change.amount_adjustment > 0
        ? `+$${change.amount_adjustment}`
        : change.amount_adjustment < 0
          ? `-$${Math.abs(change.amount_adjustment)}`
          : ''

    console.log(`\n[${date}] ${description} ${adjustment}`)
  })
}

// ============================================================================
// EJEMPLO 9: Dashboard de pricing dinámico
// ============================================================================

async function example9_pricingDashboard() {
  console.log('\n\n=== EJEMPLO 9: Dashboard de pricing ===\n')

  const subscriptionId = 'uuid-de-la-suscripcion'

  // Obtener toda la información
  const [subscription, pricing, limits, features] = await Promise.all([
    subscriptionService.getSubscriptionWithPricing(subscriptionId),
    subscriptionService.getPricingBreakdown(subscriptionId),
    subscriptionService.getSubscriptionLimits(subscriptionId),
    subscriptionService.getSubscriptionFeatures(subscriptionId),
  ])

  console.log('🏷️ PLAN ACTUAL')
  console.log('='.repeat(50))
  console.log(`Tier: ${subscription?.tier_name.toUpperCase()}`)
  console.log(`Ciclo: ${subscription?.billing_cycle}`)
  console.log(`Próxima facturación: ${subscription?.next_billing_date}`)

  console.log('\n\n💰 DESGLOSE DE PRECIO')
  console.log('='.repeat(50))
  console.log(`Precio base:          $${pricing.tier_base_price.toFixed(2)}`)
  console.log(`Features adicionales: $${pricing.features_total.toFixed(2)}`)
  if (pricing.additional_menus_cost > 0) {
    console.log(`Menús adicionales:    $${pricing.additional_menus_cost.toFixed(2)}`)
  }
  console.log('-'.repeat(50))
  console.log(`Subtotal:             $${pricing.subtotal.toFixed(2)}`)
  console.log(`Impuestos:            $${pricing.tax.toFixed(2)}`)
  console.log('='.repeat(50))
  console.log(`TOTAL MENSUAL:        $${pricing.total.toFixed(2)}`)

  console.log('\n\n🎨 FEATURES ACTIVAS')
  console.log('='.repeat(50))
  features.forEach((sf: any) => {
    const price = sf.price_at_purchase === 0 ? 'Incluida' : `$${sf.price_at_purchase}/mes`
    console.log(`✅ ${sf.feature.name} - ${price}`)
  })

  console.log('\n\n📊 LÍMITES Y USO')
  console.log('='.repeat(50))
  console.log(`Menús: ${limits.current_menus}/${limits.max_menus === -1 ? '∞' : limits.max_menus}`)
  console.log(
    `Progreso: ${'█'.repeat(Math.min((limits.current_menus / (limits.max_menus || 5)) * 10, 10))}${'░'.repeat(Math.max(10 - (limits.current_menus / (limits.max_menus || 5)) * 10, 0))}`
  )
}

// ============================================================================
// EJEMPLO 10: Simulador de costos
// ============================================================================

async function example10_costSimulator() {
  console.log('\n\n=== EJEMPLO 10: Simulador de costos ===\n')

  // Escenario: Cliente quiere saber cuánto costaría el plan Pro con ciertas features

  const tiers = await subscriptionService.getAllTiersWithFeatures()
  const proTier = tiers.find((t) => t.tier_name === 'pro')!

  console.log('🧮 Simulación de costos para plan PRO')
  console.log('='.repeat(50))
  console.log(`Precio base: $${proTier.tier_base_price}/mes`)

  console.log('\n✅ Features incluidas (gratis):')
  const includedFeatures = proTier.features.filter((f) => f.included_by_default)
  includedFeatures.forEach((f) => {
    console.log(`  - ${f.feature_name}`)
  })

  console.log('\n💰 Features opcionales:')
  const optionalFeatures = proTier.features.filter((f) => !f.included_by_default)
  optionalFeatures.forEach((f) => {
    const discount = f.discount_percentage > 0 ? ` (${f.discount_percentage}% desc.)` : ''
    console.log(`  - ${f.feature_name}: $${f.final_price}${discount}`)
  })

  // Simular: Cliente quiere agregar 3 features opcionales
  const selectedFeatures = [
    'advanced_analytics', // $9.99 - 30% = $6.99
    'pos_integration', // $14.99 - 30% = $10.49
    'multiple_locations', // $12.99 - 30% = $9.09
  ]

  const featureCosts = optionalFeatures
    .filter((f) => selectedFeatures.includes(f.feature_key))
    .reduce((sum, f) => sum + f.final_price, 0)

  const totalMonthly = proTier.tier_base_price + featureCosts

  console.log('\n\n📊 RESUMEN DE SIMULACIÓN')
  console.log('='.repeat(50))
  console.log(`Plan Pro:              $${proTier.tier_base_price.toFixed(2)}`)
  console.log(`Features adicionales:  $${featureCosts.toFixed(2)}`)
  console.log('='.repeat(50))
  console.log(`TOTAL ESTIMADO:        $${totalMonthly.toFixed(2)}/mes`)
  console.log(`TOTAL ANUAL:           $${(totalMonthly * 12).toFixed(2)}/año`)
}

// ============================================================================
// EJECUTAR TODOS LOS EJEMPLOS
// ============================================================================

export async function runAllExamples() {
  try {
    await example1_newRestaurantOnboarding()
    await example2_addModularFeatures()
    await example3_upgradeTier()
    await example4_removeFeature()
    await example5_checkLimits()
    await example6_monthlyBilling()
    await example7_cancelSubscription()
    await example8_viewHistory()
    await example9_pricingDashboard()
    await example10_costSimulator()

    console.log('\n\n✅ Todos los ejemplos ejecutados exitosamente')
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error)
  }
}

// Descomentar para ejecutar:
// runAllExamples();
