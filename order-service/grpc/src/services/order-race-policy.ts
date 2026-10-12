export type RaceOperation = 'EDIT' | 'ACCEPT' | 'CANCEL' | 'EXPIRE';
export type RaceOrderStatus = 'OPEN' | 'EDITING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export interface RaceOrder {
  orderId: string;
  requesterId: string;
  status: RaceOrderStatus;
  version: number;
  expiresAt: number;
}
export interface RaceCommand {
  id: string;
  orderId: string;
  operation: RaceOperation;
  actorId?: string;
  expectedVersion: number;
  submittedAt: number;
}
export type RaceRejection = 'INVALID_REQUEST' | 'WRONG_ORDER' | 'NOT_AUTHORISED' | 'STALE_VERSION'
  | 'NOT_OPEN' | 'UPDATE_IN_PROGRESS' | 'HIGHER_PRIORITY_OPERATION' | 'DEADLINE_PASSED';
export interface RaceDecision {
  winner?: RaceCommand;
  nextStatus?: RaceOrderStatus;
  nextVersion?: number;
  creditAction?: 'UPDATE_RESERVATION' | 'RELEASE_RESERVATION' | 'NONE';
  rejected: { command: RaceCommand; reason: RaceRejection }[];
}

const priority: Record<RaceOperation, number> = { EXPIRE: 0, CANCEL: 1, ACCEPT: 2, EDIT: 3 };
const statuses: RaceOrderStatus[] = ['OPEN', 'EDITING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0
  && value.length <= 200 && value.trim() === value && !/[\x00-\x1f]/.test(value);

/** Select a winner from pending intents while Order Service holds its order row lock.
 * This is a policy, not a database lock/queue or an HTTP handler. Do not resolve each
 * concurrent intent separately: submit them durably before selecting the pending cohort.
 */
export class OrderRacePolicy {
  decide(order: RaceOrder, pending: readonly RaceCommand[], now: number): RaceDecision {
    if (!identifier(order.orderId) || !identifier(order.requesterId) || !statuses.includes(order.status)
      || !Number.isSafeInteger(order.version) || order.version < 1 || !Number.isFinite(order.expiresAt)
      || !Number.isFinite(now)) throw new Error('Invalid order race snapshot');

    const rejected: RaceDecision['rejected'] = [];
    const eligible: RaceCommand[] = [];
    const seen = new Map<string, string>();
    for (const command of pending) {
      const encoded = JSON.stringify(command);
      if (seen.has(command.id)) {
        if (seen.get(command.id) !== encoded) throw new Error('Command ID reused with different parameters');
        continue; // The integration layer must replay the one persisted command's result.
      }
      seen.set(command.id, encoded);
      let reason: RaceRejection | undefined;
      if (!identifier(command.id) || !Object.hasOwn(priority, command.operation) || !Number.isFinite(command.submittedAt)
        || command.submittedAt > now
        || !Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1) reason = 'INVALID_REQUEST';
      else if (command.orderId !== order.orderId) reason = 'WRONG_ORDER';
      else if (command.operation !== 'EXPIRE' && (!identifier(command.actorId)
        || (command.operation === 'ACCEPT' ? command.actorId === order.requesterId : command.actorId !== order.requesterId))) reason = 'NOT_AUTHORISED';
      else if (order.status === 'EDITING') reason = 'UPDATE_IN_PROGRESS';
      else if (order.status !== 'OPEN') reason = 'NOT_OPEN';
      else if (command.operation !== 'EXPIRE' && order.expiresAt <= now) reason = 'DEADLINE_PASSED';
      else if (command.expectedVersion !== order.version) reason = 'STALE_VERSION';
      else if (command.operation === 'EXPIRE' && order.expiresAt > now) reason = 'INVALID_REQUEST';
      if (reason) rejected.push({ command, reason });
      else eligible.push(command);
    }

    // Enforce expiry even if the scheduler has not yet submitted its intent.
    if (order.status === 'OPEN' && order.expiresAt <= now && !eligible.some(c => c.operation === 'EXPIRE')) {
      eligible.push({ id: `expiry:${order.orderId}:${order.version}`, orderId: order.orderId,
        operation: 'EXPIRE', expectedVersion: order.version, submittedAt: order.expiresAt });
    }
    eligible.sort((a, b) => priority[a.operation] - priority[b.operation] || a.submittedAt - b.submittedAt
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const winner = eligible[0];
    for (const command of eligible.slice(1)) rejected.push({ command, reason: 'HIGHER_PRIORITY_OPERATION' });
    if (!winner) return { rejected };
    if (order.version >= Number.MAX_SAFE_INTEGER) throw new Error('Order version limit reached');
    const nextStatus: RaceOrderStatus = { EDIT: 'EDITING', ACCEPT: 'ACCEPTED', CANCEL: 'CANCELLED', EXPIRE: 'EXPIRED' }[winner.operation] as RaceOrderStatus;
    return { winner, nextStatus, nextVersion: order.version + 1,
      creditAction: winner.operation === 'EDIT' ? 'UPDATE_RESERVATION' : winner.operation === 'ACCEPT' ? 'NONE' : 'RELEASE_RESERVATION', rejected };
  }
}
