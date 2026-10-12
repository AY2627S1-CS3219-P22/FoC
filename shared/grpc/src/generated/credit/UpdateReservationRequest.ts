// Original file: proto/credit.proto


export interface UpdateReservationRequest {
  'orderId'?: (string);
  'amount'?: (number);
  'expectedVersion'?: (number);
  'idempotencyKey'?: (string);
}

export interface UpdateReservationRequest__Output {
  'orderId': (string);
  'amount': (number);
  'expectedVersion': (number);
  'idempotencyKey': (string);
}
