import { Router } from 'express';
import restaurantsRouter from './restaurants';
import menusRouter from './menus';
import healthRouter from './health';
import subscriptionsRouter from './subscriptions';
import authRouter from './auth';
import adminRouter from './admin';

const router = Router();

// Rutas de la API
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/restaurants', restaurantsRouter);
router.use('/menus', menusRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/admin', adminRouter);

export default router;
