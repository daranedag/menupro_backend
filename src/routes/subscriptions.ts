// ============================================================================
// Rutas de Suscripciones
// Endpoints para gestionar tiers, features y facturaciÃ³n
// ============================================================================

import { Router, Request, Response } from 'express'
import { SubscriptionService } from '../services/subscriptions.service'
import { supabase } from '../config/supabase'
import { authenticate } from '../middleware/auth'
import { ApiResponseUtil } from '../utils/response'

const router = Router()

// Instancia del servicio (en producciÃ³n, usar inyecciÃ³n de dependencias)
const subscriptionService = new SubscriptionService(supabase)

// ============================================================================
// TIERS - PÃºblicos (para ver opciones antes de suscribirse)
// ============================================================================

/**
 * GET /api/subscriptions/tiers
 * Obtiene todos los tiers disponibles con sus features
 */
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const tiers = await subscriptionService.getAllTiersWithFeatures()
    return ApiResponseUtil.success(res, tiers, 'Tiers obtenidos exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/tiers/:tierId
 * Obtiene un tier especÃ­fico con sus features
 */
router.get('/tiers/:tierId', async (req: Request, res: Response) => {
  try {
    const tierId = parseInt(req.params.tierId)
    const tier = await subscriptionService.getTierById(tierId)

    if (!tier) {
      return ApiResponseUtil.notFound(res, 'Tier no encontrado')
    }

    return ApiResponseUtil.success(res, tier, 'Tier obtenido exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/tiers/:tierId/features
 * Obtiene las features disponibles para un tier
 */
router.get('/tiers/:tierId/features', async (req: Request, res: Response) => {
  try {
    const tierId = parseInt(req.params.tierId)
    const features = await subscriptionService.getAvailableFeaturesForTier(tierId)
    return ApiResponseUtil.success(res, features, 'Features obtenidas exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

// ============================================================================
// FEATURES - PÃºblicas
// ============================================================================

/**
 * GET /api/subscriptions/features
 * Obtiene todas las features disponibles
 */
router.get('/features', async (req: Request, res: Response) => {
  try {
    const features = await subscriptionService.getAllFeatures()
    return ApiResponseUtil.success(res, features, 'Features obtenidas exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

// ============================================================================
// SUSCRIPCIONES - Requieren autenticaciÃ³n
// ============================================================================

/**
 * POST /api/subscriptions
 * Crea una nueva suscripciÃ³n
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { restaurant_id, tier_id, billing_cycle, feature_ids } = req.body

    // Validaciones bÃ¡sicas
    if (!restaurant_id || !tier_id) {
      return ApiResponseUtil.badRequest(res, 'restaurant_id y tier_id son requeridos')
    }

    // TODO: Verificar que el usuario sea owner del restaurante

    const subscriptionId = await subscriptionService.createSubscription({
      restaurant_id,
      tier_id,
      billing_cycle: billing_cycle || 'monthly',
      feature_ids: feature_ids || [],
    })

    const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)

    return ApiResponseUtil.success(res, subscription, 'SuscripciÃ³n creada exitosamente', 201)
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/:subscriptionId
 * Obtiene una suscripciÃ³n especÃ­fica con pricing
 */
router.get('/:subscriptionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params

    const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)

    if (!subscription) {
      return ApiResponseUtil.notFound(res, 'SuscripciÃ³n no encontrada')
    }

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    return ApiResponseUtil.success(res, subscription, 'SuscripciÃ³n obtenida exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/restaurant/:restaurantId
 * Obtiene todas las suscripciones de un restaurante
 */
router.get('/restaurant/:restaurantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params

    // TODO: Verificar que el usuario sea owner del restaurante

    const subscriptions = await subscriptionService.getRestaurantSubscriptions(restaurantId)

    return ApiResponseUtil.success(res, subscriptions, 'Suscripciones obtenidas exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/restaurant/:restaurantId/active
 * Obtiene la suscripciÃ³n activa de un restaurante
 */
router.get(
  '/restaurant/:restaurantId/active',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params

      // TODO: Verificar que el usuario sea owner del restaurante

      const subscription = await subscriptionService.getActiveSubscription(restaurantId)

      if (!subscription) {
        return ApiResponseUtil.notFound(res, 'No hay suscripciÃ³n activa')
      }

      return ApiResponseUtil.success(res, subscription, 'SuscripciÃ³n activa obtenida exitosamente')
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

/**
 * GET /api/subscriptions/:subscriptionId/pricing
 * Obtiene desglose detallado de pricing
 */
router.get('/:subscriptionId/pricing', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    const pricing = await subscriptionService.getPricingBreakdown(subscriptionId)

    return ApiResponseUtil.success(res, pricing, 'Pricing obtenido exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/:subscriptionId/limits
 * Obtiene los lÃ­mites y capacidades de la suscripciÃ³n
 */
router.get('/:subscriptionId/limits', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    const limits = await subscriptionService.getSubscriptionLimits(subscriptionId)

    return ApiResponseUtil.success(res, limits, 'LÃ­mites obtenidos exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

// ============================================================================
// FEATURES - Agregar/Remover
// ============================================================================

/**
 * POST /api/subscriptions/:subscriptionId/features
 * Agrega una feature a la suscripciÃ³n
 */
router.post(
  '/:subscriptionId/features',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params
      const { feature_id, prorated } = req.body

      if (!feature_id) {
        return ApiResponseUtil.badRequest(res, 'feature_id es requerido')
      }

      // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

      // Validar si se puede agregar
      const validation = await subscriptionService.validateFeatureAddition(
        subscriptionId,
        feature_id
      )

      if (!validation.can_add) {
        return ApiResponseUtil.badRequest(res, validation.reason || 'No se puede agregar la feature')
      }

      const featureId = await subscriptionService.addFeature({
        subscription_id: subscriptionId,
        feature_id,
        prorated: prorated ?? false,
      })

      const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(
        subscriptionId
      )

      return ApiResponseUtil.success(
        res,
        {
          feature_id: featureId,
          subscription: updatedSubscription,
        },
        'Feature agregada exitosamente',
        201
      )
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

/**
 * DELETE /api/subscriptions/:subscriptionId/features/:featureId
 * Remueve una feature de la suscripciÃ³n
 */
router.delete(
  '/:subscriptionId/features/:featureId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId, featureId } = req.params
      const { prorated } = req.body

      // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

      await subscriptionService.removeFeature({
        subscription_id: subscriptionId,
        feature_id: parseInt(featureId),
        prorated: prorated ?? true,
      })

      const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(
        subscriptionId
      )

      return ApiResponseUtil.success(
        res,
        { subscription: updatedSubscription },
        'Feature removida exitosamente'
      )
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

/**
 * GET /api/subscriptions/:subscriptionId/features
 * Obtiene las features activas de una suscripciÃ³n
 */
router.get(
  '/:subscriptionId/features',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params

      // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

      const features = await subscriptionService.getSubscriptionFeatures(subscriptionId)

      return ApiResponseUtil.success(res, features, 'Features obtenidas exitosamente')
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

// ============================================================================
// CAMBIO DE TIER
// ============================================================================

/**
 * PATCH /api/subscriptions/:subscriptionId/tier
 * Cambia el tier de una suscripciÃ³n
 */
router.patch('/:subscriptionId/tier', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params
    const { new_tier_id, prorated } = req.body

    if (!new_tier_id) {
      return ApiResponseUtil.badRequest(res, 'new_tier_id es requerido')
    }

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    await subscriptionService.changeTier({
      subscription_id: subscriptionId,
      new_tier_id,
      prorated: prorated ?? true,
    })

    const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)

    return ApiResponseUtil.success(res, updatedSubscription, 'Tier cambiado exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

// ============================================================================
// FACTURACIÃ“N
// ============================================================================

/**
 * GET /api/subscriptions/:subscriptionId/invoices
 * Obtiene todas las facturas de una suscripciÃ³n
 */
router.get('/:subscriptionId/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    const invoices = await subscriptionService.getSubscriptionInvoices(subscriptionId)

    return ApiResponseUtil.success(res, invoices, 'Facturas obtenidas exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * GET /api/subscriptions/invoices/:invoiceId
 * Obtiene una factura especÃ­fica con sus lÃ­neas
 */
router.get('/invoices/:invoiceId', authenticate, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params

    // TODO: Verificar que el usuario tenga acceso a esta factura

    const invoice = await subscriptionService.getInvoiceWithLineItems(invoiceId)

    if (!invoice) {
      return ApiResponseUtil.notFound(res, 'Factura no encontrada')
    }

    return ApiResponseUtil.success(res, invoice, 'Factura obtenida exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * POST /api/subscriptions/:subscriptionId/invoices
 * Genera una nueva factura para la suscripciÃ³n
 */
router.post(
  '/:subscriptionId/invoices',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params
      const { period_start, period_end } = req.body

      if (!period_start || !period_end) {
        return ApiResponseUtil.badRequest(res, 'period_start y period_end son requeridos')
      }

      // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n
      // TODO: Solo admins pueden generar facturas manualmente

      const invoiceId = await subscriptionService.generateInvoice(
        subscriptionId,
        new Date(period_start),
        new Date(period_end)
      )

      const invoice = await subscriptionService.getInvoiceWithLineItems(invoiceId)

      return ApiResponseUtil.success(res, invoice, 'Factura generada exitosamente', 201)
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

// ============================================================================
// CANCELACIÃ“N Y RENOVACIÃ“N
// ============================================================================

/**
 * POST /api/subscriptions/:subscriptionId/cancel
 * Cancela una suscripciÃ³n
 */
router.post('/:subscriptionId/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params
    const { reason } = req.body

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    await subscriptionService.cancelSubscription(subscriptionId, reason)

    const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)

    return ApiResponseUtil.success(res, updatedSubscription, 'SuscripciÃ³n cancelada exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

/**
 * POST /api/subscriptions/:subscriptionId/reactivate
 * Reactiva una suscripciÃ³n cancelada
 */
router.post(
  '/:subscriptionId/reactivate',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params

      // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

      await subscriptionService.reactivateSubscription(subscriptionId)

      const updatedSubscription = await subscriptionService.getSubscriptionWithPricing(
        subscriptionId
      )

      return ApiResponseUtil.success(res, updatedSubscription, 'SuscripciÃ³n reactivada exitosamente')
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 500)
    }
  }
)

// ============================================================================
// HISTORIAL
// ============================================================================

/**
 * GET /api/subscriptions/:subscriptionId/history
 * Obtiene el historial de cambios de una suscripciÃ³n
 */
router.get('/:subscriptionId/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params

    // TODO: Verificar que el usuario tenga acceso a esta suscripciÃ³n

    const history = await subscriptionService.getSubscriptionHistory(subscriptionId)

    return ApiResponseUtil.success(res, history, 'Historial obtenido exitosamente')
  } catch (error: any) {
    return ApiResponseUtil.error(res, error.message, 500)
  }
})

export default router

