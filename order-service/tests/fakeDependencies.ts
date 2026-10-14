import type {
  CreditGateway,
  OrderDependencies,
  Reservation,
  ExternalResult,
} from '../src/dependencies/orderDependencies';

// Test-only idempotent ledger. NEVER wired into the production application.
export function fakeDependencies() {
  const reservations = new Map<string, Reservation>();
  let debits = 0,
    settlements = 0,
    refunds = 0;
  const control = {
    reserveUnknownOnce: false,
    reserveThrowOnce: false,
    settleUnknownOnce: false,
    refundUnknownOnce: false,
    rejectReservation: false,
    mismatchReservation: false,
    afterReserve: undefined as (() => Promise<void>) | undefined,
  };
  const confirmed = (value: Reservation): ExternalResult<Reservation> => ({
    kind: 'confirmed',
    value: { ...value },
  });
  const available = (userId: string) =>
    1000 -
    [...reservations.values()]
      .filter((receipt) => receipt.requesterId === userId && receipt.status !== 'RELEASED')
      .reduce((sum, receipt) => sum + receipt.amount, 0);
  const credits: CreditGateway = {
    async getBalance(userId) {
      return { kind: 'confirmed', value: { availableCredits: available(userId) } };
    },
    async reserve(input) {
      if (control.rejectReservation) return { kind: 'rejected' };
      let receipt = reservations.get(input.orderId);
      if (!receipt && input.amount > available(input.requesterId)) return { kind: 'rejected' };
      if (!receipt) {
        receipt = {
          orderId: input.orderId,
          requesterId: input.requesterId,
          amount: input.amount,
          status: 'RESERVED',
        };
        reservations.set(input.orderId, receipt);
        debits++;
      }
      if (control.afterReserve) {
        const callback = control.afterReserve;
        control.afterReserve = undefined;
        await callback();
      }
      if (control.reserveThrowOnce) {
        control.reserveThrowOnce = false;
        throw new Error('Response lost after reservation');
      }
      if (control.reserveUnknownOnce) {
        control.reserveUnknownOnce = false;
        return { kind: 'unknown' };
      }
      return confirmed(
        control.mismatchReservation ? { ...receipt, amount: receipt.amount + 1 } : receipt,
      );
    },
    async settle(input) {
      const receipt = reservations.get(input.orderId);
      if (!receipt || receipt.status === 'RELEASED') return { kind: 'rejected' };
      if (receipt.status !== 'SETTLED') {
        receipt.status = 'SETTLED';
        receipt.courierId = input.courierId;
        settlements++;
      }
      if (control.settleUnknownOnce) {
        control.settleUnknownOnce = false;
        return { kind: 'unknown' };
      }
      return confirmed(receipt);
    },
    async refund(input) {
      const receipt = reservations.get(input.orderId);
      if (!receipt || receipt.status === 'SETTLED') return { kind: 'rejected' };
      if (receipt.status !== 'RELEASED') {
        receipt.status = 'RELEASED';
        refunds++;
      }
      if (control.refundUnknownOnce) {
        control.refundUnknownOnce = false;
        return { kind: 'unknown' };
      }
      return confirmed(receipt);
    },
    async getReservation(id) {
      const receipt = reservations.get(id);
      return receipt ? confirmed(receipt) : { kind: 'rejected' };
    },
  };
  const dependencies: OrderDependencies = {
    credits,
    users: {
      async getPublicProfile(userId) {
        return { kind: 'confirmed', value: { userId, name: 'Test Requester' } };
      },
    },
    suppliers: {
      async getActiveSupplier(supplierId) {
        return {
          kind: 'confirmed',
          value: { supplierId, pickupStore: 'Test Cafe', pickupLocation: 'COM3' },
        };
      },
    },
  };
  return { dependencies, control, reservations, counts: () => ({ debits, settlements, refunds }) };
}
