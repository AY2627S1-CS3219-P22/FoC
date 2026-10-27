// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-25 Asia/Singapore.
// Scope: Imported agreed Credit shared contract/client/tests from teammate branch; human review pending.
// Provenance and validation: order-service/usage-log.md (repository root).
// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated the human-finalized six-RPC credit contract after removing gRPC history.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012, 016 and 021 and 026.
// AI-influenced generated code; human review pending.
// Changes in entry 026: Pending human review.

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
