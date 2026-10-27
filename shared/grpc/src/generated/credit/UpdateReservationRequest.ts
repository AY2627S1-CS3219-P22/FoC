// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated the human-finalized six-RPC credit contract after removing gRPC history.
// Author review: I reviewed the generated fields.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012, 016 and 021.

// Original file: proto/credit.proto


export interface UpdateReservationRequest {
  'orderId'?: (string);
  'amount'?: (number);
  'expectedVersion'?: (number);
}

export interface UpdateReservationRequest__Output {
  'orderId': (string);
  'amount': (number);
  'expectedVersion': (number);
}
