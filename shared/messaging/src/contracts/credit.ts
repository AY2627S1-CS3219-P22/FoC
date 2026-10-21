// Message producer: credit service
// Consumers: UI gateway, notification service, user service (archive/restore confirmations)

interface CreditEventBase {
  eventId: string;
  occurredAt: string;
  /** UUID string. */
  userId: string;
}

/**
 * Balance changed for a user. Carries the full new balance (not a delta) so the
 * UI can overwrite what it shows and ignore out-of-order events via occurredAt.
 * Credits are whole numbers, matching OrderEventBase.credits.
 */
export interface CreditBalanceUpdated extends CreditEventBase {
  type: 'credit.balance_updated';
  available: number;
  reserved: number;
  /** What caused the change, for UI messaging and debugging. */
  reason: 'GRANTED' | 'RESERVED' | 'RELEASED' | 'PAID' | 'RESTORED';
}

/** Payment settled for an order (reserved credits moved from requester to courier). */
export interface CreditPaymentCompleted extends CreditEventBase {
  type: 'credit.payment_completed';
  /** userId on the base is the payer (requester). */
  orderId: string;
  payeeId: string;
  amount: number;
}

/** User deleted: balance snapshotted and credit history archived. Confirms user.deleted. */
export interface CreditUserArchived extends CreditEventBase {
  type: 'credit.user_archived';
  archivedAt: string;
  /** Remaining balance stored for restore. */
  remainingCredits: number;
  /** Same as user.deleted purgeAfter. */
  purgeAfter: string;
}

/** User restored within the retention window: balance and history are back. Confirms user.restored. */
export interface CreditUserRestored extends CreditEventBase {
  type: 'credit.user_restored';
  restoredCredits: number;
}

export type CreditEvent =
  | CreditBalanceUpdated
  | CreditPaymentCompleted
  | CreditUserArchived
  | CreditUserRestored;