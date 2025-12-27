import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { generateSlug } from '@/utils/slugify';
import type { AuthRequest } from '@/types';
import { AppError } from '@/types';

const router = Router();

// Schemas de validación
const createRestaurantSchema = z.object({
  name: z.string().min(1).max(255),
  location_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateRestaurantSchema = createRestaurantSchema.partial();

/**
 * GET /api/restaurants
 * Listar restaurants del usuario autenticado
 */
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('*, restaurant_subscriptions(*, tiers(*))')
    .eq('owner_id', req.userId!)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(`Error obteniendo restaurants: ${error.message}`, 500);
  }

  return ApiResponseUtil.success(res, data);
}));

/**
 * GET /api/restaurants/:id
 * Obtener restaurant por ID
 */
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('*, restaurant_subscriptions(*, tiers(*))')
    .eq('id', id)
    .eq('owner_id', req.userId!)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    throw new AppError('Restaurant no encontrado', 404);
  }

  return ApiResponseUtil.success(res, data);
}));

/**
 * POST /api/restaurants
 * Crear nuevo restaurant
 */
router.post(
  '/',
  authenticate,
  validate(createRestaurantSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body;
    const slug = generateSlug(body.name);

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .insert({
        owner_id: req.userId!,
        name: body.name,
        slug,
        location_name: body.location_name,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        primary_color: body.primary_color,
        secondary_color: body.secondary_color,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new AppError('Ya existe un restaurant con ese nombre', 409);
      }
      throw new AppError('Error creando restaurant', 500);
    }

    return ApiResponseUtil.created(res, data, 'Restaurant creado exitosamente');
  })
);

/**
 * PATCH /api/restaurants/:id
 * Actualizar restaurant
 */
router.patch(
  '/:id',
  authenticate,
  validate(updateRestaurantSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const body = req.body;

    // Verificar ownership
    const { data: existing } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', id)
      .eq('owner_id', req.userId!)
      .single();

    if (!existing) {
      throw new AppError('Restaurant no encontrado', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('Error actualizando restaurant', 500);

    return ApiResponseUtil.success(res, data, 'Restaurant actualizado exitosamente');
  })
);

/**
 * DELETE /api/restaurants/:id
 * Soft delete de restaurant
 */
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', req.userId!)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Restaurant no encontrado', 404);
  }

  return ApiResponseUtil.success(res, null, 'Restaurant eliminado exitosamente');
}));

export default router;
