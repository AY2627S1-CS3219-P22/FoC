// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Regenerated TypeScript from the human-finalized nine-RPC credit contract and initialization response.
// Author review: Pending human review.
// Prompts and key responses: ../../../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-influenced generated code; human review pending.

// Original file: proto/credit.proto

import type { CreditHistoryEntry as _credit_CreditHistoryEntry, CreditHistoryEntry__Output as _credit_CreditHistoryEntry__Output } from '../credit/CreditHistoryEntry';

export interface CreditHistoryPage {
  'entries'?: (_credit_CreditHistoryEntry)[];
  'nextPageToken'?: (string);
}

export interface CreditHistoryPage__Output {
  'entries': (_credit_CreditHistoryEntry__Output)[];
  'nextPageToken': (string);
}
