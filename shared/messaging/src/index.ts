import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import amqp, { type ChannelModel, type ConfirmChannel, type ConsumeMessage, type Options } from 'amqplib';
import { QueueLogger } from './queueLog';
import { deadLetterExchange, deadLetterQueue, MAX_RETRIES, RETRY_HEADER } from './topology';

export type RabbitMQConfig = {
  url?: string;
  queues?: string[];
  serviceName?: string;
  maxRetries?: number;
  /** Directory for broker.log and one file per queue. Default: logs/rabbitmq */
  logDir?: string;
  prefetch: number; //max value of the queue length
};

export type QueueMessage<T = unknown> = {
  eventId: string;
  payload: T;
  retryCount: number; 
};

const DEFAULT_PREFETCH = 10;
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
  private readonly log: QueueLogger;
  private connection: ChannelModel | undefined;
  private channel: ConfirmChannel | undefined;

  constructor(config: RabbitMQConfig = {prefetch:100}) { 
    this.config = config;
    this.log = new QueueLogger(
      config.logDir ?? path.join(process.cwd(), 'logs', 'rabbitmq'),
      config.serviceName ?? 'rabbitmq',
    );
  }

  async connect(): Promise<void> {
    const url = this.config.url || 'amqp://guest:guest@localhost:5672';
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createConfirmChannel();
    this.log.info('connected');

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
    this.log.info('closed');
  }

  async publishToQueue(queue: string, message: object, eventId?: string): Promise<boolean> {
    await this.assertQueueWithDeadLetter(queue);

    const id =
      eventId ??
      (typeof (message as { eventId?: unknown }).eventId === 'string'
        ? (message as { eventId: string }).eventId
        : randomUUID());

    const sent = await this.confirmSend(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      messageId: id,
      contentType: 'application/json',
    });
    this.log.info(sent ? 'published' : 'publish-rejected', queue, { eventId: id });
    return sent;
  }

  async consumeFromQueue<T = unknown>(queue: string, handler: QueueHandler<T>): Promise<boolean> {
    const channel = this.requireChannel();
    await this.assertQueueWithDeadLetter(queue);
    await channel.prefetch(this.config.prefetch ?? DEFAULT_PREFETCH); //safety! do not move this up or down
    const maxRetries = this.config.maxRetries ?? MAX_RETRIES;
    

    await channel.consume(
      queue,
      (msg: ConsumeMessage | null) => {
        this.handleDelivery(queue, msg, handler, maxRetries).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.log.error('delivery-failure', queue, { message });
        });
      },
      { noAck: false },
    );
    this.log.info('consuming', queue);
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
  private requireChannel(): ConfirmChannel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not connected');
    }
    return this.channel;
  }

  // Waits for the broker ack. `false` from sendToQueue only means the socket
  // buffer is full; the confirm callback is still the result that matters.
  private confirmSend(queue: string, body: Buffer, options: Options.Publish): Promise<boolean> {
    const channel = this.requireChannel();
    return new Promise((resolve) => {
      try {
        const buffered = channel.sendToQueue(queue, body, options, (err: Error | null) => {
          resolve(!err);
        });
        if (!buffered) {
          this.log.info('publish-blocked', queue, { eventId: options.messageId });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.error('publish-rejected', queue, { eventId: options.messageId, message });
        resolve(false);
      }
    });
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

  private async handleDelivery<T>(queue: string, msg: ConsumeMessage | null, handler: QueueHandler<T>, maxRetries: number,): Promise<void> {
    
    if (!msg) return;

    const channel = this.requireChannel();
    const parsedRetry = Number(msg.properties.headers?.[RETRY_HEADER] ?? 0);
    const retryCount = Number.isFinite(parsedRetry) ? parsedRetry : maxRetries;
    const messageId = msg.properties.messageId ?? '';

    let payload: T;
    try {
      payload = JSON.parse(msg.content.toString()) as T;
      if (payload === null) throw new Error('null payload'); //handle null case
    } catch {
      channel.nack(msg, false, false); //make sure no acknowledgement incites retry
      this.log.error('dead-letter', [queue, deadLetterQueue(queue)], {
        eventId: messageId,
        reason: 'invalid-json',
      });
      return;
    }

    const eventId =
      messageId ||
      (typeof (payload as { eventId?: unknown }).eventId === 'string'
        ? (payload as { eventId: string }).eventId
        : '');

    let failure: Error | undefined
    try {
      await handler({ eventId, payload, retryCount });
      channel.ack(msg);
      //this.log.info('acked', queue, { eventId, retryCount });
    } catch (err) {
      const failure = err instanceof Error ? err.message : String(err);
    }
    if (!failure) {
      channel.ack(msg);  // now outside the try haha so we dont have logging failing --> rabbitmq failing 
      this.log.info('acked', queue, { eventId, retryCount });
      return;
    }

    if (retryCount < maxRetries) {
      const republished = await this.confirmSend(queue, msg.content, {
        persistent: true,
        messageId: msg.properties.messageId,
        contentType: msg.properties.contentType ?? 'application/json',
        headers: { ...msg.properties.headers, [RETRY_HEADER]: retryCount + 1 },
      });
      if (republished) {
        channel.ack(msg);
        this.log.info('retry', queue, { eventId, retryCount: retryCount + 1, message: failure.message });
      } else {
        channel.nack(msg, false, true);
        this.log.error('retry-blocked', queue, { eventId, retryCount, message: failure.message });
      }
      return;
    }
    channel.nack(msg, false, false);
    this.log.error('dead-letter', [queue, deadLetterQueue(queue)], { eventId, retryCount, message: failure.message });
    
  }
}

export * from './topology';
export * from './contracts/credit';
export * from './contracts/order';
export * from './contracts/supplier';
export * from './contracts/user';
