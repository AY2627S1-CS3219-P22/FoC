// AI Assistance Disclosure: OpenAI Codex (GPT-6), 2026-10-30 (Asia/Singapore).
// Scope: Separated existing client construction and consumer registration for the human-specified reusable-client startup loop.
// Review: Changes await human review; prompts/key responses: ../../ai/usage-log.md, entry 047.

import { CREDIT_USER_QUEUE, RabbitMQClient } from '@foc/messaging';
import type { CreditService } from '../services/CreditService';
import { consumeUserCreated } from './userCreated';

export function createUserEventClient(url: string): RabbitMQClient {
  return new RabbitMQClient({
    url, serviceName: 'credit-service', queues: [CREDIT_USER_QUEUE], prefetch: 10,
  });
}

export async function startUserEventConsumer(
  service: Pick<CreditService, 'initCredits'>,
  broker: RabbitMQClient,
): Promise<void> {
  await consumeUserCreated(broker, CREDIT_USER_QUEUE, service);
  console.info('credit user-event listener ready', { queue: CREDIT_USER_QUEUE });
}
