import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { AppError, type AuthRequest } from '@/types';
import type { Database } from '@/types/database';
import { authenticate } from '@/middleware/auth';

const router = Router();

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  role: z.enum(['platform_admin', 'restaurant_owner']).optional().default('restaurant_owner'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(10),
});

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body as z.infer<typeof registerSchema>;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      throw new AppError(error?.message || 'No se pudo registrar el usuario', 400);
    }

    const user = data.user;

    // Obtener tier gratuito
    const { data: freeTier, error: freeTierError } = await supabaseAdmin
      .from('tiers')
      .select('id, name')
      .eq('name', 'free')
      .eq('active', true)
      .maybeSingle();

    if (freeTierError || !freeTier) {
      // Limpiar usuario creado para evitar cuentas sin tier
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (_) {
        // noop
      }
      throw new AppError('No se encontró el tier gratuito', 500);
    }

    // Crear perfil de aplicación con rol
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        role,
      });

    if (profileError) {
      // Intentar limpiar el usuario creado para evitar estados inconsistentes
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (_) {
        // Si falla el cleanup, dejamos que el error principal fluya
      }
      throw new AppError('Usuario creado pero no se pudo crear el perfil', 500);
    }

    // Crear suscripción de usuario en tier gratuito (una activa por usuario)
    const { error: subscriptionError } = await (supabaseAdmin as any)
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier_id: freeTier.id,
        billing_cycle: 'monthly',
        active: true,
        started_at: new Date().toISOString(),
        auto_renew: true,
      });

    if (subscriptionError) {
      // Limpiar para no dejar usuarios sin suscripción
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (_) {
        // noop
      }
      throw new AppError('No se pudo asignar la suscripción gratuita', 500);
    }

    const session = data.session;
    const responseUser = {
      id: user.id,
      email: user.email,
      app_role: role,
      created_at: user.created_at,
      confirmed_at: user.confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
    };

    const responseSession = session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type,
        }
      : null;

    const message = session
      ? 'Registro exitoso'
      : 'Registro exitoso, revisa tu correo para confirmar la cuenta';

    return ApiResponseUtil.created(
      res,
      {
        user: responseUser,
        session: responseSession,
        requires_email_confirmation: !session,
      },
      message
    );
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const { session, user } = data;

    // Obtener todos los restaurantes que administra el usuario
    type RestaurantBasic = Pick<Database['public']['Tables']['restaurants']['Row'], 'id' | 'name' | 'slug'>;
    type SubscriptionPricing = Database['public']['Views']['subscriptions_with_pricing']['Row'];
    // Vista user_subscriptions_with_pricing no está en tipos generados; se tipa manualmente
    type UserSubscriptionPricing = {
      subscription_id: string;
      user_id: string;
      tier_id: number;
      tier_name: string;
      tier_base_price: number;
      billing_cycle: string;
      started_at?: string | null;
      expires_at?: string | null;
      next_billing_date?: string | null;
      active: boolean;
      auto_renew?: boolean;
      monthly_total: number;
      active_features_count?: number;
      active_features?: any;
    };

    // Obtener perfil (rol de la app) desde user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new AppError('Error obteniendo perfil de usuario', 500);
    }

    const appRole = (profile as UserProfile | null)?.role ?? 'restaurant_owner';
    const profileName = (profile as UserProfile | null)?.name ?? null;

    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, slug')
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (restaurantsError) {
      throw new AppError('Error obteniendo restaurantes del usuario', 500);
    }

    // Obtener la suscripción activa (tier) del usuario
    const { data: userSubscription, error: userSubscriptionError } = await supabaseAdmin
      .from('user_subscriptions_with_pricing')
      .select(
        'subscription_id, user_id, tier_id, tier_name, tier_base_price, billing_cycle, active, monthly_total'
      )
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (userSubscriptionError) {
      throw new AppError('Error obteniendo suscripción del usuario', 500);
    }

    // Obtener la suscripción activa (tier) de cada restaurante del usuario
    const restaurantIds = (restaurants || []).map((restaurant) => (restaurant as RestaurantBasic).id);

    let restaurantsWithSubscriptions: Array<RestaurantBasic & { subscription: SubscriptionPricing | null }> =
      ((restaurants as RestaurantBasic[] | null) || []).map((restaurant) => ({
        ...restaurant,
        subscription: null,
      }));

    if (restaurantIds.length > 0) {
      const { data: activeSubscriptions, error: activeSubscriptionsError } = await supabaseAdmin
        .from('subscriptions_with_pricing')
        .select(
          'subscription_id, restaurant_id, tier_id, tier_name, tier_base_price, billing_cycle, active, monthly_total'
        )
        .in('restaurant_id', restaurantIds)
        .eq('active', true);

      if (activeSubscriptionsError) {
        throw new AppError('Error obteniendo suscripciones activas del usuario', 500);
      }

      const subscriptionByRestaurant = new Map(
        (activeSubscriptions || []).map((subscription) => [
          (subscription as SubscriptionPricing).restaurant_id,
          subscription as SubscriptionPricing,
        ])
      );

      restaurantsWithSubscriptions = ((restaurants as RestaurantBasic[] | null) || []).map((restaurant) => ({
        ...restaurant,
        subscription: subscriptionByRestaurant.get(restaurant.id) || null,
      }));
    }

    return ApiResponseUtil.success(res, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        ...user,
        app_role: appRole,
        name: profileName,
      },
      user_subscription: (userSubscription as UserSubscriptionPricing | null) || null,
      restaurants: restaurantsWithSubscriptions,
    }, 'Login exitoso');
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  validate(logoutSchema),
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body as z.infer<typeof logoutSchema>;

    const { error } = await supabaseAdmin.auth.admin.signOut(refresh_token);

    if (error) {
      throw new AppError(error.message || 'No se pudo cerrar sesión', 400);
    }

    return ApiResponseUtil.success(res, { revoked: true }, 'Logout exitoso');
  })
);

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body as z.infer<typeof updateProfileSchema>;
    const { userId } = req as AuthRequest;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ name })
      .eq('id', userId)
      .select('id, email, name, role')
      .maybeSingle();

    if (error || !profile) {
      throw new AppError('No se pudo actualizar el perfil', 500);
    }

    return ApiResponseUtil.success(res, { profile }, 'Perfil actualizado');
  })
);

export default router;