// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented order command routes and administrator-only GET /orders.
// Author review: Pending; see ../../../../usage-log.md.
import { Router, type RequestHandler } from 'express';
import type { createOrderLifecycle } from '../../services/orderLifecycle';
import { createAuthenticate, requireUser, requireAdministrator } from '../../auth/authenticate';
import type { createOrderCreation } from '../../services/orderCreation';
import type { createOrderEdits } from '../../services/orderEdits';
import type { createOrderAcceptance } from '../../services/orderAcceptance';
import { acceptOrder, cancelOrder, createOrder, editOrder, getAllOrders } from '../controllers/orderController';

export function createOrderRouter(publicKey?: string, lifecycle?: ReturnType<typeof createOrderLifecycle>, creation?: ReturnType<typeof createOrderCreation>, edits?: ReturnType<typeof createOrderEdits>, acceptance?: ReturnType<typeof createOrderAcceptance>) {
  const router = Router();
  const unavailable: RequestHandler = (_req, res) => { res.status(503).json({ error: 'dependency-unavailable' }); };
  router.use(publicKey ? createAuthenticate(publicKey) : unavailable);
  router.get('/', requireAdministrator, getAllOrders);
  router.use(requireUser);
  router.post('/', createOrder(creation));
  router.patch('/:id', editOrder(edits));
  router.post('/:id/accept', acceptOrder(acceptance));
  router.post('/:id/cancel', cancelOrder(lifecycle));
  return router;
}
