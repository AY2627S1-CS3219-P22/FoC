// Rejected means the dependency definitively rejected the operation. A timeout
// or lost response must be UNKNOWN, never interpreted as a failed transfer.
export type ExternalResult<T> =
  | { kind: 'confirmed'; value: T }
  | { kind: 'rejected' }
  | { kind: 'unavailable' }
  | { kind: 'unknown' };

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
  // Implementations MUST be atomic and idempotent by orderId and operationId.
  // Retries reuse both IDs and the identical payload.
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

// Production has no adapters yet. Missing dependencies explicitly gate writes.
export interface OrderDependencies {
  users?: UserDirectory;
  suppliers?: SupplierDirectory;
  credits?: CreditGateway;
}
