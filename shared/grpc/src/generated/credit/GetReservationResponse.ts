// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto

import type { ReservationStatus as _credit_ReservationStatus, ReservationStatus__Output as _credit_ReservationStatus__Output } from '../credit/ReservationStatus';

export interface GetReservationResponse {
  'status'?: (_credit_ReservationStatus);
  'amount'?: (number);
  'version'?: (number);
}

export interface GetReservationResponse__Output {
  'status': (_credit_ReservationStatus__Output);
  'amount': (number);
  'version': (number);
}
