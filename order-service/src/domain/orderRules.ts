import type { AuthenticatedUser } from '../auth/authProvider';
import type { Order } from '../generated/prisma';

export type OrderAction = 'accept' | 'pickup' | 'deliver' | 'cancel' | 'expire';
export type RuleFailure = 'forbidden' | 'invalid-transition' | 'expired' | 'not-due';

export function transitionFailure(
  order: Order,
  actor: AuthenticatedUser | undefined,
  action: OrderAction,
  now: Date,
): RuleFailure | undefined {
  if (action !== 'expire') {
    if (!actor?.roles.includes('USER')) return 'forbidden';
    if (
      action === 'accept'
        ? actor.id === order.requesterId
        : action === 'cancel'
          ? actor.id !== order.requesterId
          : actor.id !== order.courierId
    )
      return 'forbidden';
  }
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return 'invalid-transition';
  const overdue = order.expiryTime.getTime() <= now.getTime();
  if (action === 'expire') return overdue ? undefined : 'not-due';
  if (overdue) return 'expired';
  const expected = {
    accept: 'UNASSIGNED',
    pickup: 'ASSIGNED',
    deliver: 'PICKED_UP',
    cancel: 'UNASSIGNED',
  };
  return order.status === expected[action] ? undefined : 'invalid-transition';
}
