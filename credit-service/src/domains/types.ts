// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Moved the existing account/reservation/history/idempotency entity types into the human-specified domains folder.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–024 (prior scopes retained).
// Entry 040: OpenAI Codex (GPT-6), 2026-10-22 (Asia/Singapore).
// Scope: Removed account timestamps at the human's request; history timestamps remain.
// Changes await human review; prompts/key responses: ../../ai/usage-log.md, entry 040.
// Entry 045: OpenAI Codex (GPT-6), 2026-10-26 (Asia/Singapore).
// Scope: Removed the human-deleted idempotency user field; changes await human review.
// Prompts/key responses: ../../ai/usage-log.md, entry 045.

import type { Balance__Output as Balance } from '@foc/grpc/dist/generated/credit/Balance';

export interface CreditAccount {
  userId: string;
  totalCredits: number;
  reservedCredits: number;
}

export interface CreditHistoryEntry {
  id: string;
  sequenceId: string;
  userId: string;
  orderId: string | null;
  reservationId: string | null;
  type: string;
  totalAmountChange: number;
  totalReservedChange: number;
  createdAt: Date;
}

export interface Reservation {
  orderId: string;
  requesterId: string;
  amount: number;
  status: 'RESERVED' | 'RELEASED' | 'SETTLED';
  courierId?: string;
  reservationId: string;
  version: number;
}

export interface IdempotencyRecord<Result = Balance> {
  operationType: string;
  key: string;
  requestHash: string;
  result: Result;
}

