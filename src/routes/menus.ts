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

const updateMenuSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

const publishMenuSchema = z.object({
  is_published: z.boolean(),
});

const createSectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  order_index: z.number().int().min(0),
});

const reorderSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    })
  ).min(1),
});

const createMenuItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  image_url: z.string().url().optional(),
  available: z.boolean().optional(),
  order_index: z.number().int().min(0),
  discount_type: z.enum(['none', 'percentage', 'fixed']).optional(),
  discount_value: z.number().min(0).optional(),
});

const reorderMenuItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    })
  ).min(1),
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
 * PATCH /api/menus/:id
 * Actualizar nombre/descripcion de un menú
 */
router.patch(
  '/:id',
  authenticate,
  validate(updateMenuSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const body = req.body as z.infer<typeof updateMenuSchema>;

    // Verificar ownership del menú a través del restaurante
    const { data: menu } = await supabaseAdmin
      .from('menus')
      .select('id, restaurant_id, name, slug, restaurants!inner(owner_id)')
      .eq('id', id)
      .single();

    if (!menu || (menu as any).restaurants?.owner_id !== req.userId) {
      throw new AppError('Menú no encontrado', 404);
    }

    let slug = (menu as any).slug as string;
    if (body.name && body.name !== (menu as any).name) {
      slug = generateSlug(body.name);
      const { data: existing } = await supabaseAdmin
        .from('menus')
        .select('id')
        .eq('restaurant_id', (menu as any).restaurant_id)
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        slug = generateUniqueSlug(body.name);
      }
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('menus')
      .update({
        ...(body.name ? { name: body.name, slug } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError('Error actualizando menú', 500);

    return ApiResponseUtil.success(res, data, 'Menú actualizado exitosamente');
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

/**
 * POST /api/menus/:menuId/sections
 * Crear una nueva sección en un menú (permite definir posición/order_index)
 */
router.post(
  '/:menuId/sections',
  authenticate,
  validate(createSectionSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { menuId } = req.params;
    const body = req.body as z.infer<typeof createSectionSchema>;

    // Verificar ownership del menú a través del restaurante
    const { data: menu } = await supabaseAdmin
      .from('menus')
      .select('id, restaurant_id, restaurants!inner(owner_id)')
      .eq('id', menuId)
      .single();

    if (!menu || (menu as any).restaurants?.owner_id !== req.userId) {
      throw new AppError('Menú no encontrado', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('menu_sections')
      .insert({
        menu_id: menuId,
        name: body.name,
        description: body.description,
        order_index: body.order_index,
      } as any)
      .select()
      .single();

    if (error) throw new AppError('Error creando sección', 500);

    return ApiResponseUtil.created(res, data, 'Sección creada exitosamente');
  })
);

/**
 * POST /api/menus/sections/:sectionId/items
 * Crear un nuevo plato dentro de una sección
 */
router.post(
  '/sections/:sectionId/items',
  authenticate,
  validate(createMenuItemSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { sectionId } = req.params;
    const body = req.body as z.infer<typeof createMenuItemSchema>;

    // Verificar ownership a través del menú de la sección
    const { data: section } = await supabaseAdmin
      .from('menu_sections')
      .select('id, menu_id, menus!inner(restaurants!inner(owner_id))')
      .eq('id', sectionId)
      .single();

    if (!section || (section as any).menus?.restaurants?.owner_id !== req.userId) {
      throw new AppError('Sección no encontrada', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert({
        section_id: sectionId,
        name: body.name,
        description: body.description,
        price: body.price,
        image_url: body.image_url,
        available: body.available ?? true,
        order_index: body.order_index,
        discount_type: body.discount_type ?? 'none',
        discount_value: body.discount_value ?? 0,
      } as any)
      .select()
      .single();

    if (error) throw new AppError('Error creando plato', 500);

    return ApiResponseUtil.created(res, data, 'Plato creado exitosamente');
  })
);

/**
 * GET /api/menus/sections/:sectionId/items
 * Obtener platos de una sección
 */
router.get(
  '/sections/:sectionId/items',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { sectionId } = req.params;

    const { data: section } = await supabaseAdmin
      .from('menu_sections')
      .select('id, menus!inner(restaurants!inner(owner_id))')
      .eq('id', sectionId)
      .single();

    if (!section || (section as any).menus?.restaurants?.owner_id !== req.userId) {
      throw new AppError('Sección no encontrada', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true });

    if (error) throw new AppError('Error obteniendo platos', 500);

    return ApiResponseUtil.success(res, data, 'Platos obtenidos exitosamente');
  })
);

/**
 * PATCH /api/menus/sections/:sectionId/items/reorder
 * Actualizar el orden (order_index) de múltiples platos
 */
router.patch(
  '/sections/:sectionId/items/reorder',
  authenticate,
  validate(reorderMenuItemsSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { sectionId } = req.params;
    const { items } = req.body as z.infer<typeof reorderMenuItemsSchema>;

    const { data: section } = await supabaseAdmin
      .from('menu_sections')
      .select('id, menus!inner(restaurants!inner(owner_id))')
      .eq('id', sectionId)
      .single();

    if (!section || (section as any).menus?.restaurants?.owner_id !== req.userId) {
      throw new AppError('Sección no encontrada', 404);
    }

    for (const item of items) {
      const updates: Database['public']['Tables']['menu_items']['Update'] = {
        order_index: item.order_index,
      };

      const { error } = await (supabaseAdmin as any)
        .from('menu_items')
        .update(updates)
        .eq('id', item.id)
        .eq('section_id', sectionId);

      if (error) {
        throw new AppError('Error actualizando orden de platos', 500);
      }
    }

    const { data: updatedItems, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true });

    if (fetchError) throw new AppError('Error obteniendo platos actualizados', 500);

    return ApiResponseUtil.success(res, updatedItems, 'Orden de platos actualizado');
  })
);

/**
 * GET /api/menus/:menuId/sections
 * Obtener secciones existentes de un menú (ordenadas por order_index)
 */
router.get(
  '/:menuId/sections',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { menuId } = req.params;

    // Verificar ownership del menú a través del restaurante
    const { data: menu } = await supabaseAdmin
      .from('menus')
      .select('id, restaurants!inner(owner_id)')
      .eq('id', menuId)
      .single();

    if (!menu || (menu as any).restaurants?.owner_id !== req.userId) {
      throw new AppError('Menú no encontrado', 404);
    }

    const { data, error } = await supabaseAdmin
      .from('menu_sections')
      .select('*')
      .eq('menu_id', menuId)
      .order('order_index', { ascending: true });

    if (error) throw new AppError('Error obteniendo secciones', 500);

    return ApiResponseUtil.success(res, data, 'Secciones obtenidas exitosamente');
  })
);

/**
 * PATCH /api/menus/:menuId/sections/reorder
 * Actualizar el orden (order_index) de múltiples secciones
 */
router.patch(
  '/:menuId/sections/reorder',
  authenticate,
  validate(reorderSectionsSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { menuId } = req.params;
    const { sections } = req.body as z.infer<typeof reorderSectionsSchema>;

    // Verificar ownership del menú
    const { data: menu } = await supabaseAdmin
      .from('menus')
      .select('id, restaurants!inner(owner_id)')
      .eq('id', menuId)
      .single();

    if (!menu || (menu as any).restaurants?.owner_id !== req.userId) {
      throw new AppError('Menú no encontrado', 404);
    }

    // Actualizar cada sección
    for (const section of sections) {
      const updates: Database['public']['Tables']['menu_sections']['Update'] = {
        order_index: section.order_index,
      };

      const { error } = await (supabaseAdmin as any)
        .from('menu_sections')
        .update(updates)
        .eq('id', section.id)
        .eq('menu_id', menuId);

      if (error) {
        throw new AppError('Error actualizando orden de secciones', 500);
      }
    }

    // Devolver secciones ordenadas actualizadas
    const { data: updatedSections, error: fetchError } = await supabaseAdmin
      .from('menu_sections')
      .select('*')
      .eq('menu_id', menuId)
      .order('order_index', { ascending: true });

    if (fetchError) throw new AppError('Error obteniendo secciones actualizadas', 500);

    return ApiResponseUtil.success(res, updatedSections, 'Orden de secciones actualizado');
  })
);

export default router;
