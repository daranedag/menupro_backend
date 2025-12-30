import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { AppError } from '@/types';
import type { Database } from '@/types/database';

const router = Router();

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

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
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new AppError('Error obteniendo perfil de usuario', 500);
    }

    const appRole = (profile as UserProfile | null)?.role ?? 'restaurant_owner';

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
      },
      user_subscription: (userSubscription as UserSubscriptionPricing | null) || null,
      restaurants: restaurantsWithSubscriptions,
    }, 'Login exitoso');
  })
);

export default router;