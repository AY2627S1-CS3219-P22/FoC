// Original file: proto/credit.proto

import type { CreditHistoryEntry as _credit_CreditHistoryEntry, CreditHistoryEntry__Output as _credit_CreditHistoryEntry__Output } from '../credit/CreditHistoryEntry';

export interface CreditHistory {
  'entries'?: (_credit_CreditHistoryEntry)[];
  'nextPageToken'?: (string);
}

export interface CreditHistory__Output {
  'entries': (_credit_CreditHistoryEntry__Output)[];
  'nextPageToken': (string);
}
