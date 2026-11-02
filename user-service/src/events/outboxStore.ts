// AI Assistance Disclosure:
// Tool: OpenAI Codex, 2026-11-02 (Asia/Singapore).
// Scope: Added the author-specified user.deleted and user.restored outbox
// enqueue helpers, following the existing user.created pattern.
// Author review: Author specified the event flow; entry 026 was reviewed,
// manually tested, and approved.
// Author reviewed, manually tested, and approved entry 027. See
// user-service/ai/usage-log.md.

import { Prisma } from '@prisma/client';
import { CREDIT_USER_QUEUE, QUEUES } from '@foc/messaging';
import { prisma } from '../db';
import { buildUserCreated } from './userCreated';
import { buildUserDeleted } from './userDeleted';
import { buildUserRestored } from './userRestored';

export type OutboxClient = Prisma.TransactionClient | typeof prisma;

export type UnpublishedOutboxRow = {
  eventId: string;
  queue: string;
  body: string;
};

export class OutboxStore {
  constructor(private readonly db: OutboxClient = prisma) {}

  async findUnpublished(limit: number): Promise<UnpublishedOutboxRow[]> {
    return this.db.userOutbox.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { eventId: true, queue: true, body: true },
    });
  }

  async markPublished(eventId: string): Promise<void> {
    await this.db.userOutbox.update({
      where: { eventId },
      data: { publishedAt: new Date() },
    });
  }

  async recordFailure(eventId: string, message: string): Promise<void> {
    await this.db.userOutbox.update({
      where: { eventId },
      data: {
        attempts: { increment: 1 },
        lastError: message,
      },
    });
  }
}

export async function enqueueUserCreated(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  const event = buildUserCreated(userId);
  await tx.userOutbox.create({
    data: {
      eventId: event.eventId,
      queue: CREDIT_USER_QUEUE,
      body: JSON.stringify(event),
    },
  });
}

// Order only: it scrubs personal details. Credit keeps the balance and needs no event.
export async function enqueueUserDeleted(
  tx: Prisma.TransactionClient,
  userId: string,
  deletedAt: Date,
): Promise<void> {
  const event = buildUserDeleted(userId, deletedAt);
  await tx.userOutbox.create({
    data: {
      eventId: event.eventId,
      queue: QUEUES.orderUser,
      body: JSON.stringify(event),
    },
  });
}

export async function enqueueUserRestored(
  tx: Prisma.TransactionClient,
  userId: string,
  previousUserId: string,
): Promise<void> {
  const event = buildUserRestored(userId, previousUserId);
  await tx.userOutbox.create({
    data: {
      eventId: event.eventId,
      queue: CREDIT_USER_QUEUE,
      body: JSON.stringify(event),
    },
  });
}
