/*
Consumes payment commands from payment.events (credit.payment-events).
*/

import type {
  CreditReleaseCommand,
  CreditReserveCommand,
  CreditSettleCommand,
  QueueMessage,
} from '@foc/messaging';

export class CreditMessagingConsumer {
  async start(): Promise<void> {
    throw new Error('CreditMessagingConsumer.start is not implemented yet');
  }

  async handleReserve(_message: QueueMessage<CreditReserveCommand>): Promise<void> {
    throw new Error('CreditMessagingConsumer.handleReserve is not implemented yet');
  }

  async handleRelease(_message: QueueMessage<CreditReleaseCommand>): Promise<void> {
    throw new Error('CreditMessagingConsumer.handleRelease is not implemented yet');
  }

  async handleSettle(_message: QueueMessage<CreditSettleCommand>): Promise<void> {
    throw new Error('CreditMessagingConsumer.handleSettle is not implemented yet');
  }
}
