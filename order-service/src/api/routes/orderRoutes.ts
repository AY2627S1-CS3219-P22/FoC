import { Router } from 'express';
import type { AuthProvider } from '../../auth/authProvider';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { createOrderController } from '../controllers/orderController';
import type { OrderReads } from '../services/orderService';

export function createOrderRouter(provider: AuthProvider, service: OrderReads) {
  const router = Router();
  const controller = createOrderController(service);
  router.use(authenticate(provider), requireRole('USER', 'ADMINISTRATOR'));
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  return router;
}
