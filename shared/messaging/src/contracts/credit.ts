export type CreditReservationStatus = 'RESERVED' | 'RELEASED' | 'SETTLED' | 'FAILED';

/** Commands credit-service consumes from `payment.events`. */
export interface CreditReserveCommand {
  eventId: string;
  type: 'payment.reserve';
  occurredAt: string;
  orderId: string;
  requesterId: string;
  amount: number;
}

export interface CreditReleaseCommand {
  eventId: string;
  type: 'payment.release';
  occurredAt: string;
  orderId: string;
}

export interface CreditSettleCommand {
  eventId: string;
  type: 'payment.settle';
  occurredAt: string;
  orderId: string;
  courierId: string;
}

export type CreditCommand = CreditReserveCommand | CreditReleaseCommand | CreditSettleCommand;

/** Results credit-service publishes to `order.events`. */
export interface CreditResult {
  eventId: string;
  type: 'credit.reserved' | 'credit.released' | 'credit.settled' | 'credit.failed';
  occurredAt: string;
  orderId: string;
  requesterId: string;
  amount: number;
  status: CreditReservationStatus;
  courierId?: string;
  reason?: string;
}
