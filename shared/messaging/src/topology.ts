export const EXCHANGES = {
  order: 'order.events',
  payment: 'payment.events',
  supplier: 'supplier.events',
} as const;

export const QUEUES = {
  creditPayments: 'credit.payment-events',
  orderSupplier: 'order.supplier-events',
  orderCredits: 'order.credit-events',
} as const;

export const ROUTING_KEYS = {
  supplierUpdated: 'supplier.updated',
  supplierStatusChanged: 'supplier.status_changed',
  supplierDeleted: 'supplier.deleted',
} as const;

export const MAX_RETRIES = 3;
export const RETRY_HEADER = 'x-retry';

export function deadLetterExchange(queue: string): string {
  return `${queue}.dlx`;
}

export function deadLetterQueue(queue: string): string {
  return `${queue}.dlq`;
}
