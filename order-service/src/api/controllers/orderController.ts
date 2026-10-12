import type { RequestHandler } from 'express';
import type { AuthenticatedUser } from '../../auth/authProvider';
import { orderIdSchema, orderScopeSchema } from '../dto/orderDto';
import type { OrderReads } from '../services/orderService';

export function createOrderController(service: OrderReads): { list: RequestHandler; get: RequestHandler } {
  return {
    list: async (req, res) => {
      const parsed = orderScopeSchema.safeParse(req.query.scope ?? 'open');
      if (!parsed.success) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid order scope.', errors: parsed.error.issues });
        return;
      }
      const result = await service.listOrders(res.locals.user as AuthenticatedUser, parsed.data);
      if (!result.ok) {
        res.status(403).json({ error: 'Forbidden', message: 'Insufficient role.' });
        return;
      }
      res.json({ orders: result.value });
    },
    get: async (req, res) => {
      const parsed = orderIdSchema.safeParse(req.params.id);
      if (!parsed.success) {
        res.status(400).json({ error: 'Bad Request', message: 'Order ID must be a UUID.' });
        return;
      }
      const result = await service.getOrder(res.locals.user as AuthenticatedUser, parsed.data);
      if (!result.ok) {
        const missing = result.reason === 'not-found';
        res.status(missing ? 404 : 403).json({
          error: missing ? 'Not Found' : 'Forbidden',
          message: missing ? 'Order not found.' : 'You cannot view this order.',
        });
        return;
      }
      res.json({ order: result.value });
    },
  };
}
