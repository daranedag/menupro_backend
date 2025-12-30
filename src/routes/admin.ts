import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '@/config/supabase';
import { authenticate, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { AppError } from '@/types';
import type { Database } from '@/types/database';

const router = Router();

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
type TierRow = Database['public']['Tables']['tiers']['Row'];
type FeatureRow = Database['public']['Tables']['features']['Row'];
type MenuRow = Database['public']['Tables']['menus']['Row'];
type MenuSectionRow = Database['public']['Tables']['menu_sections']['Row'];
type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];

// Schemas
const updateRoleSchema = z.object({
  role: z.enum(['platform_admin', 'restaurant_owner']),
});

const updateTierSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  base_price_monthly: z.number().optional(),
  max_menus: z.number().int().optional(),
  price_per_additional_menu: z.number().optional(),
  customization_level: z.number().int().optional(),
  allows_pdf: z.boolean().optional(),
  allows_custom_fonts: z.boolean().optional(),
  allows_images: z.boolean().optional(),
  allows_multiple_locations: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const updateFeaturePriceSchema = z.object({
  base_price: z.number(),
});

// Middleware chain for admin-only routes
const adminOnly = [authenticate, requireRole(['platform_admin'])];

// GET /api/admin/users - list users with role and restaurant counts
router.get(
  '/users',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role, created_at, updated_at');

    if (profilesError) throw new AppError('Error obteniendo usuarios', 500);

    const userIds = ((profiles || []) as UserProfileRow[]).map((p) => p.id);

    let restaurantCounts: Record<string, number> = {};
    if (userIds.length > 0) {
      const { data: restaurants, error: restaurantsError } = await supabaseAdmin
        .from('restaurants')
        .select('id, owner_id')
        .in('owner_id', userIds)
        .is('deleted_at', null);

      if (restaurantsError) throw new AppError('Error obteniendo restaurantes', 500);

      restaurantCounts = ((restaurants || []) as RestaurantRow[]).reduce<Record<string, number>>((acc, r) => {
        acc[r.owner_id] = (acc[r.owner_id] || 0) + 1;
        return acc;
      }, {});
    }

    const result = ((profiles || []) as UserProfileRow[]).map((p) => ({
      ...p,
      restaurants_count: restaurantCounts[p.id] || 0,
    }));

    return ApiResponseUtil.success(res, result, 'Usuarios obtenidos');
  })
);

// PATCH /api/admin/users/:userId/role - update user role
router.patch(
  '/users/:userId/role',
  [...adminOnly, validate(updateRoleSchema)],
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body as z.infer<typeof updateRoleSchema>;

    const { error } = await (supabaseAdmin as any)
      .from('user_profiles')
      .update({ role } as Database['public']['Tables']['user_profiles']['Update'])
      .eq('id', userId);

    if (error) throw new AppError('Error actualizando rol', 500);

    return ApiResponseUtil.success(res, { user_id: userId, role }, 'Rol actualizado');
  })
);

// GET /api/admin/tiers - list tiers
router.get(
  '/tiers',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from('tiers')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw new AppError('Error obteniendo tiers', 500);

    return ApiResponseUtil.success(res, data, 'Tiers obtenidos');
  })
);

// PATCH /api/admin/tiers/:tierId - update tier
router.patch(
  '/tiers/:tierId',
  [...adminOnly, validate(updateTierSchema)],
  asyncHandler(async (req, res) => {
    const { tierId } = req.params;
    const body = req.body as z.infer<typeof updateTierSchema>;

    const updates: Database['public']['Tables']['tiers']['Update'] = { ...body } as any;

    const { data, error } = await (supabaseAdmin as any)
      .from('tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();

    if (error) throw new AppError('Error actualizando tier', 500);

    return ApiResponseUtil.success(res, data, 'Tier actualizado');
  })
);

// GET /api/admin/features - list features
router.get(
  '/features',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from('features')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new AppError('Error obteniendo features', 500);

    return ApiResponseUtil.success(res, data, 'Features obtenidas');
  })
);

// PATCH /api/admin/features/:featureId/price - update feature price
router.patch(
  '/features/:featureId/price',
  [...adminOnly, validate(updateFeaturePriceSchema)],
  asyncHandler(async (req, res) => {
    const { featureId } = req.params;
    const { base_price } = req.body as z.infer<typeof updateFeaturePriceSchema>;

    const { data, error } = await (supabaseAdmin as any)
      .from('features')
      .update({ base_price } as Database['public']['Tables']['features']['Update'])
      .eq('id', featureId)
      .select()
      .single();

    if (error) throw new AppError('Error actualizando precio de feature', 500);

    return ApiResponseUtil.success(res, data, 'Precio actualizado');
  })
);

// GET /api/admin/users/:userId/features - features associated to user's restaurants
router.get(
  '/users/:userId/features',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)
      .is('deleted_at', null);

    if (restaurantsError) throw new AppError('Error obteniendo restaurantes del usuario', 500);

    const restaurantIds = ((restaurants || []) as RestaurantRow[]).map((r) => r.id);
    if (restaurantIds.length === 0) {
      return ApiResponseUtil.success(res, [], 'Usuario sin restaurantes');
    }

    const { data: subs, error: subsError } = await supabaseAdmin
      .from('restaurant_subscriptions')
      .select('id')
      .in('restaurant_id', restaurantIds)
      .eq('active', true);

    if (subsError) throw new AppError('Error obteniendo suscripciones', 500);

    const subscriptionIds = ((subs || []) as { id: string }[]).map((s) => s.id);
    if (subscriptionIds.length === 0) {
      return ApiResponseUtil.success(res, [], 'Usuario sin suscripciones activas');
    }

    const { data: features, error: featuresError } = await supabaseAdmin
      .from('subscription_features')
      .select('feature:features(*)')
      .in('subscription_id', subscriptionIds)
      .eq('is_active', true);

    if (featuresError) throw new AppError('Error obteniendo features del usuario', 500);

    // Deduplicate by feature id
    const uniqueFeaturesMap = new Map<number, Database['public']['Tables']['features']['Row']>();
    for (const f of features || []) {
      const feature = (f as any).feature as Database['public']['Tables']['features']['Row'] | null;
      if (feature) uniqueFeaturesMap.set(feature.id, feature);
    }

    return ApiResponseUtil.success(res, Array.from(uniqueFeaturesMap.values()), 'Features del usuario');
  })
);

// GET /api/admin/restaurants/summary - summary counts for each restaurant
router.get(
  '/restaurants/summary',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('id, owner_id, name, slug')
      .is('deleted_at', null);

    if (restaurantsError) throw new AppError('Error obteniendo restaurantes', 500);

    const restaurantIds = ((restaurants || []) as RestaurantRow[]).map((r) => r.id);
    if (restaurantIds.length === 0) {
      return ApiResponseUtil.success(res, [], 'Sin restaurantes');
    }

    const { data: menus, error: menusError } = await supabaseAdmin
      .from('menus')
      .select('id, restaurant_id');

    if (menusError) throw new AppError('Error obteniendo menús', 500);

    const menuIds = ((menus || []) as MenuRow[]).map((m) => m.id);

    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from('menu_sections')
      .select('id, menu_id');

    if (sectionsError) throw new AppError('Error obteniendo secciones', 500);

    const sectionIds = ((sections || []) as MenuSectionRow[]).map((s) => s.id);

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, section_id');

    if (itemsError) throw new AppError('Error obteniendo platos', 500);

    // Build maps
    const menusByRestaurant = ((menus || []) as MenuRow[]).reduce<Record<string, string[]>>((acc, menu) => {
      acc[menu.restaurant_id] = acc[menu.restaurant_id] || [];
      acc[menu.restaurant_id].push(menu.id);
      return acc;
    }, {});

    const sectionsByMenu = ((sections || []) as MenuSectionRow[]).reduce<Record<string, string[]>>((acc, section) => {
      acc[section.menu_id] = acc[section.menu_id] || [];
      acc[section.menu_id].push(section.id);
      return acc;
    }, {});

    const itemsBySection = ((items || []) as MenuItemRow[]).reduce<Record<string, number>>((acc, item) => {
      acc[item.section_id] = (acc[item.section_id] || 0) + 1;
      return acc;
    }, {});

    const summaries = ((restaurants || []) as RestaurantRow[]).map((r) => {
      const restaurantMenuIds = menusByRestaurant[r.id] || [];
      const sectionsCount = restaurantMenuIds.reduce((sum, menuId) => {
        const sectionList = sectionsByMenu[menuId] || [];
        return sum + sectionList.length;
      }, 0);

      const itemsCount = restaurantMenuIds.reduce((sum, menuId) => {
        const sectionList = sectionsByMenu[menuId] || [];
        return sum + sectionList.reduce((innerSum, sectionId) => innerSum + (itemsBySection[sectionId] || 0), 0);
      }, 0);

      return {
        restaurant_id: r.id,
        owner_id: r.owner_id,
        name: r.name,
        slug: r.slug,
        menus_count: restaurantMenuIds.length,
        sections_count: sectionsCount,
        items_count: itemsCount,
      };
    });

    return ApiResponseUtil.success(res, summaries, 'Resumen de restaurantes');
  })
);

export default router;
