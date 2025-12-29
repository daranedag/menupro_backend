import { Router } from 'express';
import restaurantsRouter from './restaurants';
import menusRouter from './menus';
import healthRouter from './health';
import subscriptionsRouter from './subscriptions';

const router = Router();

// Rutas de la API
router.use('/health', healthRouter);
router.use('/restaurants', restaurantsRouter);
router.use('/menus', menusRouter);
router.use('/subscriptions', subscriptionsRouter);

export default router;
