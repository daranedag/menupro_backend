import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { validate } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/errorHandler';
import { ApiResponseUtil } from '@/utils/response';
import { AppError } from '@/types';

const router = Router();

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
    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, slug')
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (restaurantsError) {
      throw new AppError('Error obteniendo restaurantes del usuario', 500);
    }

    return ApiResponseUtil.success(res, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user,
      restaurants: restaurants || [],
    }, 'Login exitoso');
  })
);

export default router;