import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { generateSlug, generateUniqueSlug } from '@/utils/slugify';
import type { AuthRequest } from '@/types';
import { AppError } from '@/types';
import type { Database } from '@/types/database';

type MenuWithRestaurant = Database['public']['Views']['menus_with_restaurant']['Row'];

const router = Router();

// Schemas de validación
const createMenuSchema = z.object({
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const publishMenuSchema = z.object({
  is_published: z.boolean(),
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
  const menuData = data as MenuWithRestaurant;
  const menuId = menuData.id as string;
  const currentViewCount = (menuData.view_count as number) || 0;
  (supabaseAdmin as any)
    .from('menus')
    .update({
      view_count: currentViewCount + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', menuId)
    .then(() => {})
    .catch((err: Error) => {
      console.error('Error incrementando view count:', err.message);
    });

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
    const { data: canCreate, error: rpcError } = await (supabaseAdmin as any)
      .rpc('check_menu_limit', { p_restaurant_id: body.restaurant_id });

    if (rpcError || !canCreate) {
      throw new AppError('Has alcanzado el límite de menús de tu plan', 403);
    }
    // Verificar ownership del restaurant
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', body.restaurant_id)
      .eq('owner_id', req.userId!)
      .single();

    if (!restaurant) {
      throw new AppError('Restaurant no encontrado', 404);
    }

    // Generar slug y verificar si ya existe
    let slug = generateSlug(body.name);
    const { data: existingMenu } = await supabaseAdmin
      .from('menus')
      .select('id')
      .eq('restaurant_id', body.restaurant_id)
      .eq('slug', slug)
      .single();

    // Si existe, usar slug único con timestamp
    if (existingMenu) {
      slug = generateUniqueSlug(body.name);
    }

    const { data, error } = await supabaseAdmin
      .from('menus')
      .insert({
        restaurant_id: body.restaurant_id,
        name: body.name,
        slug,
        description: body.description,
      } as any)
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
router.patch(
  '/:id/publish',
  authenticate,
  validate(publishMenuSchema),
  asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { is_published } = req.body;

  // Verificar ownership del menú a través del restaurante
  const { data: menu } = await supabaseAdmin
    .from('menus')
    .select('id, restaurant_id, restaurants!inner(owner_id)')
    .eq('id', id)
    .single();

  if (!menu || (menu as any).restaurants?.owner_id !== req.userId) {
    throw new AppError('Menú no encontrado', 404);
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('menus')
    .update({
      is_published: is_published,
      published_at: is_published ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError('Error actualizando menú', 500);

  const message = is_published ? 'Menú publicado' : 'Menú despublicado';
  return ApiResponseUtil.success(res, data, message);
  })
);

export default router;
