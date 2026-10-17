// Rejected means the dependency definitively rejected the operation. A timeout
// or lost response must be UNKNOWN, never interpreted as a failed transfer.
export interface ExternalFailure {
  code?: number;
  reason?: 'invalid-input' | 'missing-account-or-reservation' | 'precondition' | 'authentication' | 'permission' | 'transport' | 'protocol';
}
export type ExternalResult<T> =
  | { kind: 'confirmed'; value: T }
  | ({ kind: 'rejected' } & ExternalFailure)
  | ({ kind: 'unavailable' } & ExternalFailure)
  | ({ kind: 'unknown' } & ExternalFailure);

export interface PublicProfile {
  userId: string;
  name: string;
}
export interface SupplierSnapshot {
  supplierId: string;
  pickupStore: string;
  pickupLocation: string;
}
export interface UserDirectory {
  getPublicProfile(userId: string): Promise<ExternalResult<PublicProfile>>;
}
export interface SupplierDirectory {
  getActiveSupplier(supplierId: string): Promise<ExternalResult<SupplierSnapshot>>;
}
export interface Reservation {
  orderId: string;
  requesterId: string;
  amount: number;
  status: 'RESERVED' | 'SETTLED' | 'RELEASED';
  courierId?: string;
}
export interface CreditGateway {
  getBalance(userId: string): Promise<ExternalResult<{ availableCredits: number }>>;
  // Credit deduplicates by RPC operation type + orderId. operationId is our durable
  // local tracking ID; adapters need not send it. Retries keep the same payload.
  reserve(input: {
    operationId: string;
    orderId: string;
    requesterId: string;
    amount: number;
  }): Promise<ExternalResult<Reservation>>;
  settle(input: {
    operationId: string;
    orderId: string;
    courierId: string;
  }): Promise<ExternalResult<Reservation>>;
  refund(input: { operationId: string; orderId: string }): Promise<ExternalResult<Reservation>>;
  getReservation(orderId: string): Promise<ExternalResult<Reservation>>;
}

// Production Credit is opt-in; User/Supplier adapters are still absent.
// Missing dependencies explicitly gate the operations that need them.
export interface OrderDependencies {
  users?: UserDirectory;
  suppliers?: SupplierDirectory;
  credits?: CreditGateway;
}
