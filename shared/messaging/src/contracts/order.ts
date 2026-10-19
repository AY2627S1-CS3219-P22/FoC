/*
TODO: Add in order status
*/
export type OrderStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

/*
TODO: Verify the order event base --order event owner to change
*/
interface OrderEventBase {
  eventId: string;
  occurredAt: string;
  orderId: string;
  requesterId: string;
  courierId?: string;
  supplierId: string;
  deliveryLocation: string;
  instructions: string;
  credits: number;
  status: OrderStatus;
  deadline?: string;
}

/** Fulfillment notifications published when an order is created or edited. */
export interface OrderCreated extends OrderEventBase {
  type: 'order.created';
}

export interface OrderUpdated extends OrderEventBase {
  type: 'order.updated';
}

/** Triggers a credit release / refund. */
export interface OrderCancelled extends OrderEventBase {
  type: 'order.cancelled';
  reason?: string;
}

export interface OrderCreditsEdited extends OrderEventBase {
  type: 'order.credits_edited';
  previousCredits: number;
}

export type OrderEvent = OrderCreated | OrderUpdated | OrderCancelled | OrderCreditsEdited;
