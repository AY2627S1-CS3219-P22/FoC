// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Implemented the human-specified user.created callback using the existing initialization service signature and user-ID validation rules.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED] I changed eventId and occurredAt fields to be optional, and made consumeUserCreated async, changed envelope to body and added a try loop for the await.
// Prompts and key responses: ../../ai/usage-log.md, entries 005–026 (prior scopes retained).

import type { Balance__Output as Balance } from '@foc/grpc/dist/generated/credit/Balance';
import { assertUserId, ValidationError } from '../services/validation';

export interface UserCreatedEvent {
  type: 'user.created';
  userId: string;
  eventId?: string;
  occurredAt?: string;
}

export interface UserCreatedDelivery {
  payload: unknown;
  eventId?: string;
  retryCount?: number;
}

// Compatible with the shared client's QueueHandler<UserCreatedEvent> argument.
// CreditService owns transaction completion and verification of a prior grant.
export function createUserCreatedHandler(
  creditService: { initCredits(input: { userId: string }): Promise<Omit<Balance, 'userId'>> },
): (message: UserCreatedDelivery) => Promise<void> {
  return async (message) => {
    const { payload, eventId, retryCount } = message;
    if (payload === null || typeof payload !== 'object'
      || (payload as { type?: unknown }).type !== 'user.created') {
      throw new ValidationError('Expected a user.created event');
    }

    const body = payload as { eventId?: unknown; occurredAt?: unknown };
    if (body.eventId !== undefined && typeof body.eventId !== 'string') {
      throw new ValidationError('user.created eventId must be a string when present');
    }
    if (body.occurredAt !== undefined && typeof body.occurredAt !== 'string') {
      throw new ValidationError('user.created occurredAt must be a string when present');
    }

    const userId = (payload as { userId?: unknown }).userId;
    assertUserId(userId);

    // eventId/occurredAt are envelope fields, not grant-uniqueness identifiers.
    // Resolve only after committed allocation or confirmed prior grant.
    // Propagate failures unchanged so they cannot become a successful delivery.
    try {
      await creditService.initCredits({ userId });
    } catch (error) {
      console.error('user.created handling failed', {
        userId,
        eventId,
        retryCount,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

// Supply the connected shared RabbitMQClient and the agreed queue at integration.
// No local queue name or replacement messaging client is selected here.
export async function consumeUserCreated(
  broker: {
    consumeFromQueue<T>(
      queue: string,
      handler: (message: { payload: T }) => Promise<void>,
    ): Promise<boolean>;
  },
  queue: string,
  creditService: Parameters<typeof createUserCreatedHandler>[0],
): Promise<boolean> {
  if (typeof queue !== 'string' || queue.trim().length === 0) {
    throw new ValidationError('The user.created queue must be supplied');
  }
  return broker.consumeFromQueue<UserCreatedEvent>(queue, createUserCreatedHandler(creditService));
}
