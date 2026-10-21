// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved cancellation, expiry, refund recovery and first-lock-wins.
// Author review: Pending; see ../../usage-log.md.
import type { PrismaClient, Prisma } from '../generated/prisma';
import type { createCreditClient } from '../dependencies/creditClient';
import { classifyCreditError } from '../dependencies/creditClient';

const delays = [5, 15, 45, 135, 135];
const MAX_ATTEMPTS = 6; // Initial attempt plus five retries.

async function databaseTime(tx: Prisma.TransactionClient): Promise<Date> {
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}

export function createOrderLifecycle(db: PrismaClient, credit: ReturnType<typeof createCreditClient>, additionalWork: Array<() => Promise<unknown>> = []) {
  async function cancel(orderId: string, requesterId: string) {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) return { error: 'not-found' as const, status: 404 };
      if (order.requesterId !== requesterId) return { error: 'forbidden' as const, status: 403 };
      if (order.status === 'CANCELLED' && order.cancellationReason === 'REQUESTER') return { order };
      if (order.status !== 'UNASSIGNED') return { error: 'invalid-transition' as const, status: 409 };
      if (await tx.orderEditOperation.findFirst({ where: { orderId, state: { in: ['PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED'] } } })) return { error: 'conflict' as const, status: 409 };
      const now = await databaseTime(tx);
      if (order.expiryTime <= now) return { error: 'expired' as const, status: 409 };
      const updated = await tx.order.update({ where: { id: orderId }, data: {
        status: 'CANCELLED', cancellationReason: 'REQUESTER', cancelledAt: now, creditState: 'REFUND_PENDING',
      } });
      await tx.creditOperation.upsert({ where: { orderId_type: { orderId, type: 'REFUND' } },
        create: { orderId, type: 'REFUND', payload: {}, nextRetryAt: now }, update: {} });
      return { order: updated };
    });
    if ('error' in result) return result;
    if (result.order.creditState === 'REFUND_PENDING') await refundBatch(1, orderId);
    return { order: (await db.order.findUniqueOrThrow({ where: { id: orderId } })) };
  }

  async function expireBatch(limit = 100) {
    return db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Order" WHERE status IN ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP')
        AND "expiryTime" <= clock_timestamp() ORDER BY "expiryTime"
        LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
      for (const { id } of rows) {
        const now = await databaseTime(tx);
        await tx.order.update({ where: { id }, data: {
          status: 'CANCELLED', cancellationReason: 'EXPIRY', cancelledAt: now, creditState: 'REFUND_PENDING',
        } });
        await tx.creditOperation.upsert({ where: { orderId_type: { orderId: id, type: 'REFUND' } },
          create: { orderId: id, type: 'REFUND', payload: {}, nextRetryAt: now }, update: {} });
      }
      return rows.length;
    });
  }

  async function refundBatch(limit = 100, orderId?: string) {
    await db.creditOperation.updateMany({ where: { type: 'REFUND', attempts: { gte: MAX_ATTEMPTS }, state: 'PROCESSING', leaseExpiresAt: { lte: await databaseTime(db) } },
      data: { state: 'PERMANENTLY_FAILED', leaseExpiresAt: null, lastError: 'retry-exhausted' } });
    const leased = await db.$transaction(async (tx) => {
      const now = await databaseTime(tx);
      const rows = await tx.creditOperation.findMany({ where: {
        type: 'REFUND', creation: { order: { isNot: null } }, ...(orderId ? { orderId } : {}), attempts: { lt: MAX_ATTEMPTS },
        OR: [{ state: 'PENDING', nextRetryAt: { lte: now } }, { state: 'PROCESSING', leaseExpiresAt: { lte: now } }],
      }, orderBy: { nextRetryAt: 'asc' }, take: limit });
      const claimed = [];
      for (const row of rows) {
        const leaseExpiresAt = new Date(now.getTime() + 30_000);
        const claim = await tx.creditOperation.updateMany({ where: {
          id: row.id, state: row.state, attempts: row.attempts, leaseExpiresAt: row.leaseExpiresAt,
        }, data: { state: 'PROCESSING', attempts: { increment: 1 }, leaseExpiresAt } });
        if (claim.count) claimed.push({ ...row, attempts: row.attempts + 1, leaseExpiresAt });
      }
      return claimed;
    });
    for (const work of leased) {
      let confirmed = false;
      let permanent = false;
      try {
        const order = await db.order.findUniqueOrThrow({ where: { id: work.orderId } });
        let receipt = await credit.getReservation({ orderId: work.orderId });
        if (receipt.orderId !== work.orderId || receipt.requesterId !== order.requesterId) {
          throw new Error('Reservation mismatch');
        }
        if (receipt.status === 'RESERVED') {
          await credit.releaseCredits({ orderId: work.orderId });
          receipt = await credit.getReservation({ orderId: work.orderId });
        }
        confirmed = receipt.orderId === work.orderId && receipt.requesterId === order.requesterId
          && receipt.status === 'RELEASED';
        if (!confirmed) throw new Error('Refund not confirmed');
      } catch (error) {
        permanent = classifyCreditError(error) === 'rejected';
      }
      await db.$transaction(async (tx) => {
        const now = await databaseTime(tx);
        const exhausted = work.attempts >= MAX_ATTEMPTS;
        const result = await tx.creditOperation.updateMany({ where: {
          id: work.id, state: 'PROCESSING', attempts: work.attempts, leaseExpiresAt: work.leaseExpiresAt,
        }, data: {
          state: confirmed ? 'SUCCEEDED' : permanent || exhausted ? 'PERMANENTLY_FAILED' : 'PENDING',
          leaseExpiresAt: null,
          nextRetryAt: new Date(now.getTime() + (delays[Math.min(work.attempts - 1, 4)] * 1000)),
          lastError: confirmed ? null : permanent ? 'dependency-rejected' : exhausted ? 'retry-exhausted' : 'outcome-uncertain',
        } });
        if (result.count && confirmed) {
          await tx.order.updateMany({ where: { id: work.orderId, status: 'CANCELLED', creditState: 'REFUND_PENDING' }, data: { creditState: 'REFUNDED' } });
          await tx.orderEditOperation.updateMany({ where: { orderId: work.orderId, state: { in: ['PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED'] } },
            data: { state: 'FAILED', leaseExpiresAt: null, lastError: 'order-cancelled-reservation-released' } });
        }
      });
    }
    return leased.length;
  }

  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopping = false;
  function startWorker() {
    if (running || timer || stopping) return;
    const tick = () => {
      running = (async () => { for (const task of additionalWork) await task(); await expireBatch(); await refundBatch(); })()
        .catch(() => { console.error('Order recovery batch failed'); })
        .finally(() => { running = undefined; if (!stopping) timer = setTimeout(() => { timer = undefined; tick(); }, 1000); });
    };
    tick();
  }
  async function stopWorker() { stopping = true; if (timer) clearTimeout(timer); await running; }
  return { cancel, expireBatch, refundBatch, startWorker, stopWorker };
}
