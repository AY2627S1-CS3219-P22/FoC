// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved administrator listing of all order statuses.
// Author review: Pending; see ../../usage-log.md.
import { prisma } from '../db';

export function listAllOrders() {
  return prisma.order.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true, requesterId: true, courierId: true, supplierId: true,
      pickupStore: true, pickupLocation: true, requesterName: true, courierName: true,
      destination: true, requestDetails: true, credits: true, expiryTime: true,
      status: true, cancellationReason: true, creditState: true,
      createdAt: true, updatedAt: true, acceptedAt: true, pickedUpAt: true,
      deliveredAt: true, cancelledAt: true,
    },
  });
}
