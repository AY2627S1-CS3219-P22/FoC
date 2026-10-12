// Original file: proto/credit.proto


export interface SettleCreditsRequest {
  'orderId'?: (string);
  'courierId'?: (string);
  'idempotencyKey'?: (string);
}

export interface SettleCreditsRequest__Output {
  'orderId': (string);
  'courierId': (string);
  'idempotencyKey': (string);
}
