/*
Publishes credit results to order.events (order.credit-events).

DECLARATION: Skeleton code. Please delete 
*/

import type { CreditResult } from '@foc/messaging';

export class CreditMessagingProducer {

  //credits are reserved for order
  async publishReserved(_result: CreditResult): Promise<void> {
    throw new Error('CreditMessagingProducer.publishReserved is not implemented yet');
  }

  //credits are released due to refund, cancellation
  async publishReleased(_result: CreditResult): Promise<void> {
    throw new Error('CreditMessagingProducer.publishReleased is not implemented yet');
  }


  //transaction successful
  async publishSettled(_result: CreditResult): Promise<void> {
    throw new Error('CreditMessagingProducer.publishSettled is not implemented yet');
  }

  //transaction fails
  async publishFailed(_result: CreditResult): Promise<void> {
    throw new Error('CreditMessagingProducer.publishFailed is not implemented yet');
  }
}
