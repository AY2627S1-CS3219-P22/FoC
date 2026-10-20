// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated the human-finalized six-RPC credit contract after removing gRPC history.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012, 016 and 021.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto


export interface Balance {
  'availableCredits'?: (number);
  'reservedCredits'?: (number);
  'totalCredits'?: (number);
}

export interface Balance__Output {
  'availableCredits': (number);
  'reservedCredits': (number);
  'totalCredits': (number);
}
