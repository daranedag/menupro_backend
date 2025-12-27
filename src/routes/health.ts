import { Router } from 'express';
import { supabase } from '@/config/supabase';
import { ApiResponseUtil } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('tiers').select('count').limit(1);
  
  return ApiResponseUtil.success(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: error ? 'error' : 'connected',
  });
}));

export default router;
