// AI Assistance Disclosure:
// Tool: OpenAI Codex, 2026-11-02 (Asia/Singapore).
// Scope: Added the author-specified service-layer blocked-order count for
// deletion eligibility, covering requester/courier orders and pending credit
// states. Author review: Pending. See user-service/ai/usage-log.md, entry 032.

import type { PrismaClient } from '../generated/prisma';

// How many orders stop this user deleting their account, as requester or courier.
export async function countBlockingOrders(db: PrismaClient, userId: string): Promise<number> {
  const [orders, creations] = await Promise.all([
    // Still in progress, or credits not settled or refunded yet.
    db.order.count({
      where: {
        OR: [{ requesterId: userId }, { courierId: userId }],
        AND: [
          {
            OR: [
              { status: { in: ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP'] } },
              { creditState: { notIn: ['SETTLED', 'REFUNDED'] } },
            ],
          },
        ],
      },
    }),
    // Credits may already be reserved before the Order row exists.
    db.orderCreation.count({
      where: { requesterId: userId, state: { in: ['PENDING', 'COMPENSATING'] }, order: { is: null } },
    }),
  ]);
  return orders + creations;
}
