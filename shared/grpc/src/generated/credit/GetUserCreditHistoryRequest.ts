// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto


export interface GetUserCreditHistoryRequest {
  'userId'?: (string);
  'pageSize'?: (number);
  'pageToken'?: (string);
  '_pageSize'?: "pageSize";
  '_pageToken'?: "pageToken";
}

export interface GetUserCreditHistoryRequest__Output {
  'userId': (string);
  'pageSize'?: (number);
  'pageToken'?: (string);
  '_pageSize'?: "pageSize";
  '_pageToken'?: "pageToken";
}
