// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto

import type { Timestamp as _google_protobuf_Timestamp, Timestamp__Output as _google_protobuf_Timestamp__Output } from '../google/protobuf/Timestamp';

export interface CreditHistoryEntry {
  'id'?: (string);
  'userId'?: (string);
  'orderId'?: (string);
  'reservationId'?: (string);
  'type'?: (string);
  'totalAmountChange'?: (number);
  'totalReservedChange'?: (number);
  'createdAt'?: (_google_protobuf_Timestamp | null);
  '_orderId'?: "orderId";
  '_reservationId'?: "reservationId";
}

export interface CreditHistoryEntry__Output {
  'id': (string);
  'userId': (string);
  'orderId'?: (string);
  'reservationId'?: (string);
  'type': (string);
  'totalAmountChange': (number);
  'totalReservedChange': (number);
  'createdAt': (_google_protobuf_Timestamp__Output | null);
  '_orderId'?: "orderId";
  '_reservationId'?: "reservationId";
}
