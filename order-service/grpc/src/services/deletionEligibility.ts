// AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
// Scope: Implemented the team's account-deletion blocking-order predicate.
// Author review: Pending; see ../../../usage-log.md.
import type { Prisma, PrismaClient } from '../generated/prisma';

export function deletionBlockingOrdersWhere(userId: string): Prisma.OrderWhereInput {
  if (!userId.trim()) throw new Error('userId must not be blank');
  return {
    AND: [
      { OR: [{ requesterId: userId }, { courierId: userId }] },
      { OR: [
        { status: { in: ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP'] } },
        { creditState: { in: ['RESERVED', 'SETTLEMENT_PENDING', 'REFUND_PENDING'] } },
      ] },
    ],
  };
}

// This is a point-in-time check, not a cross-service deletion lock.
// User deletion and Order's asynchronous deletion handler must also handle races.
export async function findDeletionBlockingOrders(db: PrismaClient, userId: string) {
  return db.order.findMany({
    where: deletionBlockingOrdersWhere(userId),
    select: { id: true },
    orderBy: { id: 'asc' },
  });
}
