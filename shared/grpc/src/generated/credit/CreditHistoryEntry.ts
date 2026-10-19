// Original file: proto/credit.proto


export interface CreditHistoryEntry {
  'id'?: (string);
  'userId'?: (string);
  'type'?: (string);
  'totalDelta'?: (number);
  'reservedDelta'?: (number);
  'orderId'?: (string);
  'reservationId'?: (string);
  'createdAt'?: (string);
}

export interface CreditHistoryEntry__Output {
  'id': (string);
  'userId': (string);
  'type': (string);
  'totalDelta': (number);
  'reservedDelta': (number);
  'orderId': (string);
  'reservationId': (string);
  'createdAt': (string);
}
