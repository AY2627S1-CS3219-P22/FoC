// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated the human-finalized six-RPC credit contract after removing gRPC history.
// Author review: I reviewed the design and decided to change output to include all details for convenience of processing.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012, 016 and 021 and 026.

// Original file: proto/credit.proto


export interface Balance {
  'userId'?: (string);
  'availableCredits'?: (number);
  'reservedCredits'?: (number);
  'totalCredits'?: (number);
}

export interface Balance__Output {
  'userId': (string);
  'availableCredits': (number);
  'reservedCredits': (number);
  'totalCredits': (number);
}
