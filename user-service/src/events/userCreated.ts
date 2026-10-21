import { randomUUID } from 'node:crypto';
import { RabbitMQClient, CREDIT_USER_QUEUE, type UserCreated } from '@foc/messaging';

export { CREDIT_USER_QUEUE };
export type { UserCreated };

export function buildUserCreated(userId: string): UserCreated {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('userId must be a non-empty string');
  }

  return {
    type: 'user.created',
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    userId,
  };
}

async function publishFromCli(): Promise<void> {
  const userIds = process.argv.slice(2);
  if (userIds.length === 0) throw new Error('Pass at least one user id');

  const client = new RabbitMQClient({
    serviceName: 'dev-script',
    prefetch: 10,
  });
  await client.connect();
  try {
    for (const userId of userIds) {
      const event = buildUserCreated(userId);
      const ok = await client.publishToQueue(CREDIT_USER_QUEUE, event, event.eventId);
      console.log(ok ? 'published' : 'NOT confirmed', userId);
    }
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  publishFromCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
