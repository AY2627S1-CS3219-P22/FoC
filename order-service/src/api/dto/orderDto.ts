import { z } from 'zod';
import type { Order } from '../../generated/prisma';

export const orderIdSchema = z.uuid();
export const orderScopeSchema = z.enum(['open', 'requested', 'assigned', 'all']);
export type OrderScope = z.infer<typeof orderScopeSchema>;

// Explicit mapping prevents internal creation/operation records from leaking.
// Bigints are decimal strings; dates remain machine-readable ISO instants.
export function toOrderDto(order: Order) {
  return {
    id: order.id,
    requesterId: order.requesterId,
    courierId: order.courierId,
    supplierId: order.supplierId.toString(),
    pickupStore: order.pickupStore,
    pickupLocation: order.pickupLocation,
    requesterName: order.requesterName,
    courierName: order.courierName,
    destination: order.destination,
    requestDetails: order.requestDetails,
    credits: order.credits,
    expiryTime: order.expiryTime.toISOString(),
    status: order.status,
    cancellationReason: order.cancellationReason,
    creditState: order.creditState,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
  };
}

export type OrderDto = ReturnType<typeof toOrderDto>;
