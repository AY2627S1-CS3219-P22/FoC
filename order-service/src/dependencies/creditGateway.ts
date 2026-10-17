import type { CreditGateway, ExternalResult, Reservation } from './orderDependencies';

// Structural boundary for the PR's shared promise client. No protobuf field
// numbers or unmerged generated files are duplicated here.
export interface CreditClient<Options> {
  getBalance(input: { userId: string }, options: Options): Promise<unknown>;
  reserveCredits(input: { orderId: string; requesterId: string; amount: number }, options: Options): Promise<unknown>;
  releaseCredits(input: { orderId: string }, options: Options): Promise<unknown>;
  settleCredits(input: { orderId: string; courierId: string }, options: Options): Promise<unknown>;
  getReservation(input: { orderId: string }, options: Options): Promise<unknown>;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('Invalid credit response');
  return value as Record<string, unknown>;
}
function reservation(value: unknown): Reservation {
  const row = record(value);
  if (typeof row.orderId !== 'string' || !row.orderId ||
      typeof row.requesterId !== 'string' || !row.requesterId ||
      !Number.isInteger(row.amount) || (row.amount as number) < 1 || (row.amount as number) > 2147483647 ||
      !['RESERVED', 'RELEASED', 'SETTLED'].includes(row.status as string) ||
      (row.courierId !== undefined && typeof row.courierId !== 'string') ||
      (row.status === 'SETTLED' && !row.courierId)) throw new Error('Invalid credit receipt');
  return { orderId: row.orderId, requesterId: row.requesterId, amount: row.amount as number,
    status: row.status as Reservation['status'], courierId: (row.courierId as string) || undefined };
}

export function createCreditGateway<Options>(
  client: CreditClient<Options>,
  // Called per RPC: the caller supplies fresh metadata and an overall deadline.
  options: () => Options,
): CreditGateway {
  async function call<T>(invoke: () => Promise<unknown>, parse: (value: unknown) => T): Promise<ExternalResult<T>> {
    let value: unknown;
    try { value = await invoke(); }
    catch (error) {
      const raw = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
      const code = typeof raw === 'number' ? raw : undefined;
      // Missing accounts and credential failures can be repaired; do not poison
      // durable settlement/refund intents by marking them permanently failed.
      if (code === 5) return { kind: 'unavailable', code, reason: 'missing-account-or-reservation' };
      if (code === 16 || code === 7) return { kind: 'unavailable', code, reason: code === 16 ? 'authentication' : 'permission' };
      if (code === 3 || code === 9) return { kind: 'rejected', code, reason: code === 3 ? 'invalid-input' : 'precondition' };
      // Exhausted retries may have committed. Never report a definitive failure.
      return { kind: 'unknown', code, reason: 'transport' };
    }
    try { return { kind: 'confirmed', value: parse(value) }; }
    catch { return { kind: 'unknown', reason: 'protocol' }; }
  }
  return {
    getBalance(userId) {
      return call(() => client.getBalance({ userId }, options()), value => {
        const row = record(value);
        if (row.userId !== userId || !Number.isSafeInteger(row.availableCredits) || (row.availableCredits as number) < 0)
          throw new Error('Invalid balance');
        return { availableCredits: row.availableCredits as number };
      });
    },
    reserve: ({ orderId, requesterId, amount }) => call(() => client.reserveCredits({ orderId, requesterId, amount }, options()), reservation),
    refund: ({ orderId }) => call(() => client.releaseCredits({ orderId }, options()), reservation),
    settle: ({ orderId, courierId }) => call(() => client.settleCredits({ orderId, courierId }, options()), reservation),
    getReservation: orderId => call(() => client.getReservation({ orderId }, options()), reservation),
  };
}
