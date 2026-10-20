// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto

import type { ReservationStatus as _credit_ReservationStatus, ReservationStatus__Output as _credit_ReservationStatus__Output } from '../credit/ReservationStatus';

export interface Reservation {
  'orderId'?: (string);
  'requesterId'?: (string);
  'amount'?: (number);
  'status'?: (_credit_ReservationStatus);
  'courierId'?: (string);
  'reservationId'?: (string);
  'version'?: (number);
  '_courierId'?: "courierId";
}

export interface Reservation__Output {
  'orderId': (string);
  'requesterId': (string);
  'amount': (number);
  'status': (_credit_ReservationStatus__Output);
  'courierId'?: (string);
  'reservationId': (string);
  'version': (number);
  '_courierId'?: "courierId";
}
