import type { RequestHandler } from 'express';
import type { AuthenticatedUser } from '../../auth/authProvider';
import { orderIdSchema, orderScopeSchema } from '../dto/orderDto';
import type { OrderReads } from '../services/orderService';
import { createOrderSchema, idempotencyKeySchema, actionBodySchema } from '../dto/createOrderDto';
import type { CommandResult, OrderCommands } from '../services/orderCommands';
import type { Response } from 'express';

function commandResponse(res: Response, result: CommandResult) {
  if (result.ok) {
    res.status(result.pending ? 202 : result.created ? 201 : 200).json({ order: result.order });
    return;
  }
  if (result.reason === 'pending') {
    res.status(202).json({ creationId: result.creationId, state: 'PENDING' });
    return;
  }
  const status =
    result.reason === 'invalid-input'
      ? 400
      : result.reason === 'forbidden'
        ? 403
        : result.reason === 'not-found'
          ? 404
          : result.reason === 'dependency-unavailable'
            ? 503
            : 409;
  res
    .status(status)
    .json({
      error: result.reason,
      ...(result.creationId ? { creationId: result.creationId } : {}),
    });
}

export function createCommandController(commands?: OrderCommands): {
  create: RequestHandler;
  transition: RequestHandler;
} {
  return {
    create: async (req, res) => {
      const input = createOrderSchema.safeParse(req.body);
      const key = idempotencyKeySchema.safeParse(req.headers['idempotency-key']);
      if (!input.success || !key.success) {
        res
          .status(400)
          .json({
            error: 'invalid-input',
            message: 'Valid order body and Idempotency-Key are required.',
          });
        return;
      }
      if (!commands) return commandResponse(res, { ok: false, reason: 'dependency-unavailable' });
      commandResponse(
        res,
        await commands.createOrder(res.locals.user as AuthenticatedUser, input.data, key.data),
      );
    },
    transition: async (req, res) => {
      const id = orderIdSchema.safeParse(req.params.id);
      if (!id.success || !actionBodySchema.safeParse(req.body ?? {}).success) {
        res
          .status(400)
          .json({
            error: 'invalid-input',
            message: 'UUID required; lifecycle actions accept no fields.',
          });
        return;
      }
      if (!commands) return commandResponse(res, { ok: false, reason: 'dependency-unavailable' });
      // Actions come from fixed route registrations, never an arbitrary body.
      const action = res.locals.orderAction as 'accept' | 'pickup' | 'deliver' | 'cancel';
      commandResponse(
        res,
        await commands.transition(res.locals.user as AuthenticatedUser, id.data, action),
      );
    },
  };
}

export function createOrderController(service: OrderReads): {
  list: RequestHandler;
  get: RequestHandler;
} {
  return {
    list: async (req, res) => {
      const parsed = orderScopeSchema.safeParse(req.query.scope ?? 'open');
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: 'Bad Request',
            message: 'Invalid order scope.',
            errors: parsed.error.issues,
          });
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
