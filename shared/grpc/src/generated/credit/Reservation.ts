// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated the human-finalized six-RPC credit contract after removing gRPC history.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012, 016 and 021.
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
