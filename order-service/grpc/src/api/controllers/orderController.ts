// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved cancellation HTTP wiring.
// Author review: Pending; see ../../../../usage-log.md.
import type { RequestHandler } from 'express';
import type { createOrderLifecycle } from '../../services/orderLifecycle';
import { z } from 'zod';
import { createOrderSchema, editOrderSchema, idempotencyKeySchema } from '../dto/orderInput';
import type { createOrderCreation, CommandResult } from '../../services/orderCreation';
import type { createOrderEdits } from '../../services/orderEdits';

export function cancelOrder(lifecycle?: ReturnType<typeof createOrderLifecycle>): RequestHandler {
  return async (req, res, next) => {
    const id = z.uuid().safeParse(req.params.id);
    if (!id.success || !z.object({}).strict().safeParse(req.body ?? {}).success) {
      res.status(400).json({ error: 'invalid-input' }); return;
    }
    if (!lifecycle) { res.status(503).json({ error: 'dependency-unavailable' }); return; }
    try {
      const result = await lifecycle.cancel(id.data, res.locals.user.id);
      if ('error' in result) { res.status(result.status ?? 500).json({ error: result.error }); return; }
      const order = result.order;
      res.status(order.creditState === 'REFUNDED' ? 200 : 202).json({ order: {
        ...order, supplierId: order.supplierId.toString(),
      } });
    } catch (error) { next(error); }
  };
}

function sendResult(res: import('express').Response, result: CommandResult) {
  if (result.error) { res.status(result.status).json({ error: result.error, ...(result.creationId ? { creationId: result.creationId } : {}) }); return; }
  if (result.order) { res.status(result.status).json({ order: { ...result.order, supplierId: result.order.supplierId.toString() } }); return; }
  res.status(result.status).json({ creationId: result.creationId, state: result.state });
}

export function createOrder(creation?: ReturnType<typeof createOrderCreation>): RequestHandler {
  return async (req, res, next) => {
    const body = createOrderSchema.safeParse(req.body);
    const key = idempotencyKeySchema.safeParse(req.headers['idempotency-key']);
    if (!body.success || !key.success) { res.status(400).json({ error: 'invalid-input', message: 'Valid order body and Idempotency-Key are required.' }); return; }
    if (!creation) { res.status(503).json({ error: 'dependency-unavailable' }); return; }
    try { sendResult(res, await creation.submit(res.locals.user.id, key.data, body.data)); } catch (error) { next(error); }
  };
}

export function editOrder(edits?: ReturnType<typeof createOrderEdits>): RequestHandler {
  return async (req, res, next) => {
    const body = editOrderSchema.safeParse(req.body);
    const id = z.uuid().safeParse(req.params.id);
    const key = idempotencyKeySchema.safeParse(req.headers['idempotency-key']);
    if (!body.success || !id.success || !key.success) { res.status(400).json({ error: 'invalid-input' }); return; }
    if (!edits) { res.status(503).json({ error: 'dependency-unavailable' }); return; }
    try { sendResult(res, await edits.edit(id.data, res.locals.user.id, key.data, body.data)); } catch (error) { next(error); }
  };
}
