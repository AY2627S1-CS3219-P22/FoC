import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { deadLetterExchange, deadLetterQueue, MAX_RETRIES, RETRY_HEADER } from './topology';

export type RabbitMQConfig = {
  url?: string;
  queues?: string[];
  serviceName?: string;
  maxRetries?: number;
};

export type QueueMessage<T = unknown> = {
  eventId: string;
  payload: T;
  retryCount: number;
};


/*
Classic RabbitMQ singleton 

**AI declaration**
AI has suggested the following additions that were accepted by @sunpterodactyl
- Generic queuehandler added in: 
- close() function added in
- uuid for eventId using the event broker 

*/

export type QueueHandler<T = unknown> = (message: QueueMessage<T>) => Promise<void>;

//Singleton 
export class RabbitMQClient {
  private readonly config: RabbitMQConfig;
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(config: RabbitMQConfig = {}) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const url = this.config.url || 'amqp://guest:guest@localhost:5672';
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    if (this.config.queues) {
      for (const queue of this.config.queues) {
        await this.assertQueueWithDeadLetter(queue); //add in dlq
      }
    }
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = undefined;
    this.connection = undefined;
  }

  async publishToQueue(queue: string, message: object, eventId?: string): Promise<boolean> {
    const channel = this.requireChannel();
    await this.assertQueueWithDeadLetter(queue);

    const id =
      eventId ??
      (typeof (message as { eventId?: unknown }).eventId === 'string'
        ? (message as { eventId: string }).eventId
        : randomUUID());

    return channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      messageId: id,
      contentType: 'application/json',
    });
  }

  async consumeFromQueue<T = unknown>(queue: string, handler: QueueHandler<T>): Promise<boolean> {
    const channel = this.requireChannel();
    await this.assertQueueWithDeadLetter(queue);
    const maxRetries = this.config.maxRetries ?? MAX_RETRIES;

    await channel.consume(
      queue,
      (msg) => {
        void this.handleDelivery(queue, msg, handler, maxRetries);
      },
      { noAck: false },
    );
    return true;
  }

  async assertQueueWithDeadLetter(queue: string): Promise<void> {
    const channel = this.requireChannel();
    const dlx = deadLetterExchange(queue);
    const dlq = deadLetterQueue(queue);

    await channel.assertExchange(dlx, 'direct', { durable: true });
    await channel.assertQueue(dlq, { durable: true });
    await channel.bindQueue(dlq, dlx, queue);
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: dlx,
      deadLetterRoutingKey: queue,
    });
  }

  /*
  if(!this.channel) {
    //logic
  }

  is repeated across publishToQueue, consumeFromQueue, assertQueueWithDeadLetter
  since this.channel is a field, if it is not defined it falls back to default undefined

  1. This function adds in a clear failure point if a publish/consume action is taken before connect() or after close()
  2. Narrows the type declaration so callers can use it without extra if(! this.channel) checks

  */
  private requireChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not connected');
    }
    return this.channel;
  }

  /*
  Generic handler abstracted to handle message 
  for consumer

  - Ignore null (consumer cancelled)
  - Parse JSON; on failure, nack(..., requeue: false) → DLQ
  - Call your domain handler
  - Success → ack
  - Failure and retries left → republish with x-retry + 1, then ack the original
  - Failure and retries exhausted → nack without requeue → DLQ
  */

  private async handleDelivery<T>(
    queue: string,
    msg: ConsumeMessage | null,
    handler: QueueHandler<T>,
    maxRetries: number,
  ): Promise<void> {
    if (!msg) return;
    const channel = this.requireChannel();
    const retryCount = Number(msg.properties.headers?.[RETRY_HEADER] ?? 0);

    let payload: T;
    try {
      payload = JSON.parse(msg.content.toString()) as T;
    } catch {
      channel.nack(msg, false, false); //make sure no acknowledgement incites retry
      return;
    }

    try {
      const eventId =
        msg.properties.messageId ??
        (typeof (payload as { eventId?: unknown }).eventId === 'string'
          ? (payload as { eventId: string }).eventId
          : '');
      await handler({ eventId, payload, retryCount });
      channel.ack(msg);
    } catch {
      if (retryCount < maxRetries) {
        const republished = channel.sendToQueue(queue, msg.content, {
          persistent: true,
          messageId: msg.properties.messageId,
          contentType: msg.properties.contentType ?? 'application/json',
          headers: { ...msg.properties.headers, [RETRY_HEADER]: retryCount + 1 },
        });
        if (republished) {
          channel.ack(msg);
        } else {
          channel.nack(msg, false, true);
        }
        return;
      }
      channel.nack(msg, false, false);
    }
  }
}

export * from './topology';
export * from './contracts/credit';
export * from './contracts/order';
export * from './contracts/supplier';
