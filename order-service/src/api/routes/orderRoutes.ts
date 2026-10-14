import { Router } from 'express';
import type { AuthProvider } from '../../auth/authProvider';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { createOrderController, createCommandController } from '../controllers/orderController';
import type { OrderReads } from '../services/orderService';
import type { OrderCommands } from '../services/orderCommands';

export function createOrderRouter(
  provider: AuthProvider,
  service: OrderReads,
  commands?: OrderCommands,
) {
  const router = Router();
  const controller = createOrderController(service);
  router.use(authenticate(provider), requireRole('USER', 'ADMINISTRATOR'));
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  const writes = createCommandController(commands);
  router.post('/', requireRole('USER'), writes.create);
  for (const action of ['accept', 'pickup', 'deliver', 'cancel'] as const) {
    router.post(
      `/:id/${action}`,
      requireRole('USER'),
      (_req, res, next) => {
        res.locals.orderAction = action;
        next();
      },
      writes.transition,
    );
  }
  return router;
}
