// Original file: proto/credit.proto


export interface ReserveCreditsRequest {
  'orderId'?: (string);
  'requesterId'?: (string);
  'amount'?: (number);
  'idempotencyKey'?: (string);
}

export interface ReserveCreditsRequest__Output {
  'orderId': (string);
  'requesterId': (string);
  'amount': (number);
  'idempotencyKey': (string);
}
