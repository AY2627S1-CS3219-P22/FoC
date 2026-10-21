// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved cancellation HTTP wiring.
// Author review: Pending; see ../../../../usage-log.md.
import { Router, type RequestHandler } from 'express';
import type { createOrderLifecycle } from '../../services/orderLifecycle';
import { createAuthenticate, requireUser } from '../../auth/authenticate';
import type { createOrderCreation } from '../../services/orderCreation';
import type { createOrderEdits } from '../../services/orderEdits';
import { cancelOrder, createOrder, editOrder } from '../controllers/orderController';

export function createOrderRouter(publicKey?: string, lifecycle?: ReturnType<typeof createOrderLifecycle>, creation?: ReturnType<typeof createOrderCreation>, edits?: ReturnType<typeof createOrderEdits>) {
  const router = Router();
  const unavailable: RequestHandler = (_req, res) => { res.status(503).json({ error: 'dependency-unavailable' }); };
  router.use(publicKey ? createAuthenticate(publicKey) : unavailable, requireUser);
  router.post('/', createOrder(creation));
  router.patch('/:id', editOrder(edits));
  router.post('/:id/cancel', cancelOrder(lifecycle));
  return router;
}
