import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { generateSlug } from '@/utils/slugify';
import type { AuthRequest } from '@/types';
import { AppError } from '@/types';

const router = Router();

// Schemas de validación
const createMenuSchema = z.object({
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

/**
 * GET /api/menus/restaurant/:restaurantId
 * Listar menús de un restaurant
 */
router.get('/restaurant/:restaurantId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { restaurantId } = req.params;

  // Verificar ownership del restaurant
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', req.userId!)
    .single();

  if (!restaurant) {
    throw new AppError('Restaurant no encontrado', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('Error obteniendo menús', 500);

  return ApiResponseUtil.success(res, data);
}));

/**
 * GET /api/menus/public/:restaurantSlug/:menuSlug
 * Ver menú público (sin autenticación)
 */
router.get('/public/:restaurantSlug/:menuSlug', optionalAuth, asyncHandler(async (req, res) => {
  const { restaurantSlug, menuSlug } = req.params;

  const { data, error } = await supabase
    .from('menus_with_restaurant')
    .select('*')
    .eq('restaurant_slug', restaurantSlug)
    .eq('menu_slug', menuSlug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    throw new AppError('Menú no encontrado', 404);
  }

  // Incrementar view count (async, no bloquear respuesta)
  supabase
    .from('menus')
    .update({
      view_count: data.view_count + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {});

  return ApiResponseUtil.success(res, data);
}));

/**
 * POST /api/menus
 * Crear nuevo menú
 */
router.post(
  '/',
  authenticate,
  validate(createMenuSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body;

    // Verificar límite de menús según tier
    const { data: canCreate } = await supabaseAdmin
      .rpc('check_menu_limit', { p_restaurant_id: body.restaurant_id });

    if (!canCreate) {
      throw new AppError('Has alcanzado el límite de menús de tu plan', 403);
    }

    const slug = generateSlug(body.name);

    const { data, error } = await supabaseAdmin
      .from('menus')
      .insert({
        restaurant_id: body.restaurant_id,
        name: body.name,
        slug,
        description: body.description,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Ya existe un menú con ese nombre en este restaurant', 409);
      }
      throw new AppError('Error creando menú', 500);
    }

    return ApiResponseUtil.created(res, data, 'Menú creado exitosamente');
  })
);

/**
 * PATCH /api/menus/:id/publish
 * Publicar/despublicar menú
 */
router.patch('/:id/publish', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { is_published } = req.body;

  const { data, error } = await supabaseAdmin
    .from('menus')
    .update({ is_published })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Error actualizando menú', 500);

  const message = is_published ? 'Menú publicado' : 'Menú despublicado';
  return ApiResponseUtil.success(res, data, message);
}));

export default router;
