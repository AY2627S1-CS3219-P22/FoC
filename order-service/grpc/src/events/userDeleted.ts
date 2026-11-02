// AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
// Scope: Shared RabbitMQ subscription and durable, repeat-safe deletion-event receipt.
// Author review: Pending; see ../../../usage-log.md.
import { NonRetryableError, QUEUES, RabbitMQClient, userDeletedSchema, type QueueHandler } from '@foc/messaging';
import type { PrismaClient } from '../generated/prisma';

export function createUserDeletedHandler(db: PrismaClient): QueueHandler<unknown> {
  return async ({ payload, eventId }) => {
    // The shared User queue may also receive created/restored events. Order has
    // no action for either, especially no reassignment of old orders on restore.
    const type = (payload as { type?: unknown } | null)?.type;
    if (type === 'user.created' || type === 'user.restored') return;
    const parsed = userDeletedSchema.safeParse(payload);
    if (!parsed.success) throw new NonRetryableError('Invalid user.deleted event');
    const event = parsed.data;
    if (eventId && eventId !== event.eventId) throw new NonRetryableError('Delivery eventId does not match payload');
    // ACK follows the durable write. Re-delivery after a crash cannot create a
    // second receipt. Deletion lifecycle processing is separate from receipt.
    await db.userDeletionEvent.createMany({
      data: { eventId: event.eventId, userId: event.userId,
        occurredAt: new Date(event.occurredAt), deletedAt: new Date(event.deletedAt) },
      skipDuplicates: true,
    });
    const stored = await db.userDeletionEvent.findUniqueOrThrow({ where: { eventId: event.eventId } });
    if (stored.userId !== event.userId || stored.deletedAt.getTime() !== new Date(event.deletedAt).getTime()
      || stored.occurredAt.getTime() !== new Date(event.occurredAt).getTime()) {
      throw new NonRetryableError('Conflicting user.deleted eventId');
    }
  };
}

export async function startUserDeletedConsumer(db: PrismaClient, url: string) {
  const broker = new RabbitMQClient({ url, serviceName: 'order-service', queues: [QUEUES.orderUser], prefetch: 10 });
  try {
    await broker.connect();
    await broker.consumeFromQueue(QUEUES.orderUser, createUserDeletedHandler(db));
    console.info('Order user.deleted subscription ready', { queue: QUEUES.orderUser });
    return broker;
  } catch (error) {
    await broker.close().catch(() => undefined);
    throw error;
  }
}
