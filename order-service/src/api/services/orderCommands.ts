import { createHash, randomUUID } from 'node:crypto';
import {
  Prisma,
  type Order,
  type PrismaClient,
  type CreditOperation,
} from '../../generated/prisma';
import type { AuthenticatedUser } from '../../auth/authProvider';
import type {
  OrderDependencies,
  ExternalResult,
  Reservation,
} from '../../dependencies/orderDependencies';
import { transitionFailure, type OrderAction } from '../../domain/orderRules';
import {
  createOrderSchema,
  idempotencyKeySchema,
  type CreateOrderInput,
} from '../dto/createOrderDto';
import { orderIdSchema, toOrderDto, type OrderDto } from '../dto/orderDto';

export type CommandReason =
  | 'forbidden'
  | 'not-found'
  | 'invalid-input'
  | 'invalid-transition'
  | 'expired'
  | 'conflict'
  | 'dependency-unavailable'
  | 'dependency-rejected'
  | 'pending';
export type CommandResult =
  | { ok: true; order: OrderDto; pending: boolean; created?: boolean }
  | { ok: false; reason: CommandReason; creationId?: string };
export interface OrderCommands {
  createOrder(
    actor: AuthenticatedUser,
    input: CreateOrderInput,
    key: string,
  ): Promise<CommandResult>;
  transition(
    actor: AuthenticatedUser,
    id: string,
    action: Exclude<OrderAction, 'expire'>,
  ): Promise<CommandResult>;
  expireOrders(
    limit?: number,
  ): Promise<
    | { ok: true; cancelled: number; pendingCredits: number }
    | { ok: false; reason: 'dependency-unavailable' }
  >;
  retryPendingCredits(
    limit?: number,
  ): Promise<
    | { ok: true; completed: number; pending: number }
    | { ok: false; reason: 'dependency-unavailable' }
  >;
}

type Prepared = CreateOrderInput & {
  requesterName: string;
  pickupStore: string;
  pickupLocation: string;
};
const success = (order: Order, created = false): CommandResult => ({
  ok: true,
  order: toOrderDto(order),
  pending: order.creditState === 'SETTLEMENT_PENDING' || order.creditState === 'REFUND_PENDING',
  created,
});
const failure = (reason: CommandReason, creationId?: string): CommandResult => ({
  ok: false,
  reason,
  ...(creationId ? { creationId } : {}),
});

// Dependencies can throw on transport failure. Losing a response is uncertain.
async function external<T>(call: () => Promise<ExternalResult<T>>): Promise<ExternalResult<T>> {
  try {
    return await call();
  } catch {
    return { kind: 'unknown' };
  }
}
async function databaseNow(tx: Prisma.TransactionClient): Promise<Date> {
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
  return row.now;
}
async function lockOrder(tx: Prisma.TransactionClient, id: string): Promise<Order | undefined> {
  const [row] = await tx.$queryRaw<
    Order[]
  >`SELECT * FROM "Order" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return row;
}
function matches(
  receipt: Reservation,
  orderId: string,
  requesterId: string,
  amount: number,
  status: Reservation['status'],
  courierId?: string,
) {
  return (
    receipt.orderId === orderId &&
    receipt.requesterId === requesterId &&
    receipt.amount === amount &&
    receipt.status === status &&
    (status !== 'SETTLED' || receipt.courierId === courierId)
  );
}

export function createOrderCommands(
  db: PrismaClient,
  dependencies: OrderDependencies = {},
): OrderCommands {
  // No executor is installed in startup. These methods are also callable with
  // explicit test doubles; no successful fake is ever wired into production.
  async function completeOperation(order: Order, operation: CreditOperation): Promise<Order> {
    if (operation.state === 'SUCCEEDED' || operation.state === 'PERMANENTLY_FAILED') return order;
    await db.creditOperation.update({
      where: { id: operation.id },
      data: { attempts: { increment: 1 } },
    });
    const credits = dependencies.credits!;
    const response =
      operation.type === 'SETTLE'
        ? await external(() =>
            credits.settle({
              operationId: operation.id,
              orderId: order.id,
              courierId: order.courierId!,
            }),
          )
        : await external(() => credits.refund({ operationId: operation.id, orderId: order.id }));
    const expected = operation.type === 'SETTLE' ? 'SETTLED' : 'RELEASED';
    if (
      response.kind === 'confirmed' &&
      matches(
        response.value,
        order.id,
        order.requesterId,
        order.credits,
        expected,
        order.courierId ?? undefined,
      )
    ) {
      return db.$transaction(async (tx) => {
        await tx.creditOperation.update({
          where: { id: operation.id },
          data: { state: 'SUCCEEDED', lastError: null, leaseExpiresAt: null },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { creditState: operation.type === 'SETTLE' ? 'SETTLED' : 'REFUNDED' },
        });
      });
    }
    // Never erase a success recorded by a concurrent idempotent replay.
    await db.creditOperation.updateMany({
      where: { id: operation.id, state: { not: 'SUCCEEDED' } },
      data: {
        state: response.kind === 'rejected' ? 'PERMANENTLY_FAILED' : 'PENDING',
        lastError: response.kind,
        leaseExpiresAt: null,
      },
    });
    return db.order.findUniqueOrThrow({ where: { id: order.id } });
  }

  async function compensate(orderId: string, requesterId: string, amount: number): Promise<void> {
    const operation = await db.creditOperation.upsert({
      where: { orderId_type: { orderId, type: 'REFUND' } },
      create: { orderId, type: 'REFUND', payload: { requesterId, amount } },
      update: {},
    });
    if (operation.state === 'SUCCEEDED' || operation.state === 'PERMANENTLY_FAILED') return;
    await db.creditOperation.update({
      where: { id: operation.id },
      data: { attempts: { increment: 1 } },
    });
    const response = await external(() =>
      dependencies.credits!.refund({ operationId: operation.id, orderId }),
    );
    if (
      response.kind === 'confirmed' &&
      matches(response.value, orderId, requesterId, amount, 'RELEASED')
    ) {
      await db.$transaction([
        db.creditOperation.update({
          where: { id: operation.id },
          data: { state: 'SUCCEEDED', lastError: null, leaseExpiresAt: null },
        }),
        db.orderCreation.update({ where: { orderId }, data: { state: 'FAILED' } }),
      ]);
    } else {
      await db.creditOperation.updateMany({
        where: { id: operation.id, state: { not: 'SUCCEEDED' } },
        data: {
          lastError: response.kind,
          state: response.kind === 'rejected' ? 'PERMANENTLY_FAILED' : 'PENDING',
          leaseExpiresAt: null,
        },
      });
    }
  }

  return {
    async createOrder(actor, raw, key) {
      if (!actor.roles.includes('USER')) return failure('forbidden');
      const parsed = createOrderSchema.safeParse(raw);
      const parsedKey = idempotencyKeySchema.safeParse(key);
      if (!parsed.success || !parsedKey.success) return failure('invalid-input');
      if (!dependencies.credits || !dependencies.users || !dependencies.suppliers)
        return failure('dependency-unavailable');
      const input = parsed.data;
      const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      let creation = await db.orderCreation.findUnique({
        where: {
          requesterId_idempotencyKey: { requesterId: actor.id, idempotencyKey: parsedKey.data },
        },
      });
      if (!creation) {
        const now = await databaseNow(db);
        if (new Date(input.expiryTime) <= now) return failure('expired');
        const profile = await external(() => dependencies.users!.getPublicProfile(actor.id));
        const supplier = await external(() =>
          dependencies.suppliers!.getActiveSupplier(input.supplierId),
        );
        if (profile.kind !== 'confirmed' || supplier.kind !== 'confirmed') {
          return failure(
            profile.kind === 'rejected' || supplier.kind === 'rejected'
              ? 'dependency-rejected'
              : 'dependency-unavailable',
          );
        }
        if (
          profile.value.userId !== actor.id ||
          supplier.value.supplierId !== input.supplierId ||
          !profile.value.name.trim() ||
          !supplier.value.pickupStore.trim() ||
          !supplier.value.pickupLocation.trim()
        )
          return failure('dependency-rejected');
        const prepared: Prepared = {
          ...input,
          requesterName: profile.value.name,
          pickupStore: supplier.value.pickupStore,
          pickupLocation: supplier.value.pickupLocation,
        };
        try {
          creation = await db.orderCreation.create({
            data: {
              orderId: randomUUID(),
              requesterId: actor.id,
              idempotencyKey: parsedKey.data,
              requestFingerprint: fingerprint,
              payload: prepared,
              creditOperations: {
                create: {
                  type: 'RESERVE',
                  payload: { requesterId: actor.id, amount: input.credits },
                },
              },
            },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
            throw error;
          creation = await db.orderCreation.findUniqueOrThrow({
            where: {
              requesterId_idempotencyKey: { requesterId: actor.id, idempotencyKey: parsedKey.data },
            },
          });
        }
      }
      if (creation.requestFingerprint !== fingerprint) return failure('conflict');
      const existing = await db.order.findUnique({ where: { id: creation.orderId } });
      if (existing) return success(existing);
      if (creation.state === 'FAILED') return failure('dependency-rejected', creation.orderId);
      if (creation.state === 'COMPENSATING') {
        await compensate(creation.orderId, actor.id, input.credits);
        return failure('expired', creation.orderId);
      }
      const reserve = await db.creditOperation.findUniqueOrThrow({
        where: { orderId_type: { orderId: creation.orderId, type: 'RESERVE' } },
      });
      if (reserve.state !== 'SUCCEEDED') {
        const balance = await external(() => dependencies.credits!.getBalance(actor.id));
        if (balance.kind !== 'confirmed') return failure('pending', creation.orderId);
        // Balance is advisory: an earlier/concurrent request may have reserved
        // these funds already. The idempotent reservation is authoritative.
        if (
          !Number.isSafeInteger(balance.value.availableCredits) ||
          balance.value.availableCredits < 0
        )
          return failure('pending', creation.orderId);
        await db.creditOperation.update({
          where: { id: reserve.id },
          data: { attempts: { increment: 1 } },
        });
        const response = await external(() =>
          dependencies.credits!.reserve({
            operationId: reserve.id,
            orderId: creation.orderId,
            requesterId: actor.id,
            amount: input.credits,
          }),
        );
        if (
          response.kind !== 'confirmed' ||
          !matches(response.value, creation.orderId, actor.id, input.credits, 'RESERVED')
        ) {
          // A rejection after an earlier uncertain call requires reconciliation;
          // preserve intent rather than claiming the reservation never happened.
          if (response.kind === 'rejected' && reserve.attempts === 0) {
            await db.$transaction([
              db.orderCreation.update({
                where: { orderId: creation.orderId },
                data: { state: 'FAILED' },
              }),
              db.creditOperation.update({
                where: { id: reserve.id },
                data: { state: 'PERMANENTLY_FAILED', lastError: 'rejected' },
              }),
            ]);
            return failure('dependency-rejected', creation.orderId);
          }
          return failure('pending', creation.orderId);
        }
        await db.creditOperation.update({
          where: { id: reserve.id },
          data: { state: 'SUCCEEDED', lastError: null },
        });
      }
      // Reservation is confirmed. If this transaction fails, intent and receipt
      // remain durable; retrying the same key resumes publication without debit.
      const published = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "orderId" FROM "OrderCreation" WHERE "orderId" = ${creation.orderId}::uuid FOR UPDATE`;
        const current = await tx.orderCreation.findUniqueOrThrow({
          where: { orderId: creation.orderId },
        });
        const order = await tx.order.findUnique({ where: { id: creation.orderId } });
        if (order) return success(order);
        if (current.state === 'COMPENSATING') return failure('expired', creation.orderId);
        if (current.state !== 'PENDING') return failure('conflict', creation.orderId);
        const now = await databaseNow(tx);
        if (new Date(input.expiryTime) <= now) {
          await tx.orderCreation.update({
            where: { orderId: creation.orderId },
            data: { state: 'COMPENSATING' },
          });
          await tx.creditOperation.upsert({
            where: { orderId_type: { orderId: creation.orderId, type: 'REFUND' } },
            create: {
              orderId: creation.orderId,
              type: 'REFUND',
              payload: { requesterId: actor.id, amount: input.credits },
            },
            update: {},
          });
          return failure('expired', creation.orderId);
        }
        const payload = current.payload as unknown as Prepared;
        const created = await tx.order.create({
          data: {
            id: creation.orderId,
            requesterId: actor.id,
            supplierId: BigInt(input.supplierId),
            destination: input.destination,
            requestDetails: input.requestDetails,
            credits: input.credits,
            expiryTime: new Date(input.expiryTime),
            createdAt: now,
            requesterName: payload.requesterName,
            pickupStore: payload.pickupStore,
            pickupLocation: payload.pickupLocation,
          },
        });
        await tx.orderCreation.update({
          where: { orderId: creation.orderId },
          data: { state: 'SUCCEEDED' },
        });
        return success(created, true);
      });
      if (!published.ok && published.reason === 'expired')
        await compensate(creation.orderId, actor.id, input.credits);
      return published;
    },

    async transition(actor, id, action) {
      if (!actor.roles.includes('USER')) return failure('forbidden');
      if (!orderIdSchema.safeParse(id).success) return failure('invalid-input');
      if ((action === 'deliver' || action === 'cancel') && !dependencies.credits)
        return failure('dependency-unavailable');
      const changed = await db.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        if (!order) return { result: failure('not-found') };
        // Terminal request replay may finish a pending transfer, but never
        // changes terminal status or authorizes another user to execute it.
        const repeat =
          (action === 'deliver' && order.status === 'DELIVERED' && order.courierId === actor.id) ||
          (action === 'cancel' &&
            order.status === 'CANCELLED' &&
            order.cancellationReason === 'REQUESTER' &&
            order.requesterId === actor.id);
        if (repeat) {
          const operation = await tx.creditOperation.findUnique({
            where: {
              orderId_type: { orderId: id, type: action === 'deliver' ? 'SETTLE' : 'REFUND' },
            },
          });
          return { result: success(order), order, operation };
        }
        const now = await databaseNow(tx);
        const rule = transitionFailure(order, actor, action, now);
        if (rule) return { result: failure(rule === 'not-due' ? 'invalid-transition' : rule) };
        const data: Prisma.OrderUpdateInput =
          action === 'accept'
            ? { status: 'ASSIGNED', courierId: actor.id, acceptedAt: now }
            : action === 'pickup'
              ? { status: 'PICKED_UP', pickedUpAt: now }
              : action === 'deliver'
                ? { status: 'DELIVERED', deliveredAt: now, creditState: 'SETTLEMENT_PENDING' }
                : {
                    status: 'CANCELLED',
                    cancellationReason: 'REQUESTER',
                    cancelledAt: now,
                    creditState: 'REFUND_PENDING',
                  };
        const updated = await tx.order.update({ where: { id }, data });
        const operation =
          action === 'deliver' || action === 'cancel'
            ? await tx.creditOperation.create({
                data: {
                  orderId: id,
                  type: action === 'deliver' ? 'SETTLE' : 'REFUND',
                  payload: {
                    requesterId: order.requesterId,
                    amount: order.credits,
                    ...(action === 'deliver' ? { courierId: actor.id } : {}),
                  },
                },
              })
            : null;
        return { result: success(updated), order: updated, operation };
      });
      if (changed.order && changed.operation)
        return success(await completeOperation(changed.order, changed.operation));
      return changed.result;
    },

    async expireOrders(limit = 100) {
      if (!dependencies.credits) return { ok: false, reason: 'dependency-unavailable' };
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
        throw new RangeError('Expiry batch size must be 1–1000.');
      const changed = await db.$transaction(async (tx) => {
        const orders = await tx.$queryRaw<Order[]>`SELECT * FROM "Order"
          WHERE "status" IN ('UNASSIGNED', 'ASSIGNED', 'PICKED_UP') AND "expiryTime" <= clock_timestamp()
          ORDER BY "expiryTime", "id" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
        const now = await databaseNow(tx);
        const results: { order: Order; operation: CreditOperation }[] = [];
        for (const order of orders) {
          const updated = await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'EXPIRY',
              cancelledAt: now,
              creditState: 'REFUND_PENDING',
            },
          });
          const operation = await tx.creditOperation.create({
            data: {
              orderId: order.id,
              type: 'REFUND',
              payload: { requesterId: order.requesterId, amount: order.credits },
            },
          });
          results.push({ order: updated, operation });
        }
        return results;
      });
      let pendingCredits = 0;
      for (const item of changed) {
        const order = await completeOperation(item.order, item.operation);
        if (order.creditState === 'REFUND_PENDING') pendingCredits++;
      }
      return { ok: true, cancelled: changed.length, pendingCredits };
    },

    async retryPendingCredits(limit = 100) {
      if (!dependencies.credits) return { ok: false, reason: 'dependency-unavailable' };
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
        throw new RangeError('Retry batch size must be 1–1000.');
      // Lease a bounded batch; crashed workers become eligible after 30 seconds.
      // RESERVE is resumed by replaying the original creation key, not here.
      const operations = await db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<CreditOperation[]>`SELECT * FROM "CreditOperation"
          WHERE "type" IN ('SETTLE', 'REFUND') AND "nextRetryAt" <= clock_timestamp()
            AND ("state" = 'PENDING' OR ("state" = 'PROCESSING' AND "leaseExpiresAt" <= clock_timestamp()))
          ORDER BY "createdAt", "id" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
        const now = await databaseNow(tx);
        for (const row of rows)
          await tx.creditOperation.update({
            where: { id: row.id },
            data: {
              state: 'PROCESSING',
              leaseExpiresAt: new Date(now.getTime() + 30_000),
            },
          });
        return rows;
      });
      let completed = 0;
      for (const operation of operations) {
        const order = await db.order.findUnique({ where: { id: operation.orderId } });
        if (order) await completeOperation(order, operation);
        else {
          const creation = await db.orderCreation.findUniqueOrThrow({
            where: { orderId: operation.orderId },
          });
          if (creation.state === 'COMPENSATING' && operation.type === 'REFUND') {
            const payload = creation.payload as unknown as Prepared;
            await compensate(creation.orderId, creation.requesterId, payload.credits);
          } else {
            await db.creditOperation.updateMany({
              where: { id: operation.id, state: 'PROCESSING' },
              data: {
                state: 'PENDING',
                leaseExpiresAt: null,
                lastError: 'No eligible order or compensating creation',
              },
            });
          }
        }
        if (
          (await db.creditOperation.findUniqueOrThrow({ where: { id: operation.id } })).state ===
          'SUCCEEDED'
        )
          completed++;
      }
      return { ok: true, completed, pending: operations.length - completed };
    },
  };
}
