// AI Assistance Disclosure:
// Tool: OpenAI Codex, 2026-11-02 (Asia/Singapore).
// Scope: Implemented the author-specified deletion-eligibility gRPC handler,
// including blocked-order counting and error mapping. Author review: Pending.
// See user-service/ai/usage-log.md, entry 031.

import { status } from '@grpc/grpc-js';
import { OrderService, createServer, unimplemented, type OrderServiceHandlers } from '@foc/grpc';
import { prisma } from '../db';
import { countBlockingOrders } from '../services/deletionEligibility';

export const handlers: OrderServiceHandlers = {
  GetOrder: unimplemented('GetOrder'),
  // User Service calls this before deleting an account.
  CheckDeletionEligibility(call, callback) {
    const userId = call.request.userId;
    if (!userId) {
      callback({ code: status.INVALID_ARGUMENT, details: 'user_id is required' });
      return;
    }

    countBlockingOrders(prisma, userId).then((blockedOrderCount) => {
      callback(null, { eligible: blockedOrderCount === 0, blockedOrderCount });
    }).catch((err) => {
      console.error('CheckDeletionEligibility failed:', err);
      callback({ code: status.INTERNAL, details: 'Internal error' });
    });
  },
};

export function createGrpcServer() {
  return createServer(OrderService.service, handlers);
}
