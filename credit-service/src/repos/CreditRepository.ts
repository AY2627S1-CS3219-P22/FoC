// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Typed the human's account/reservation/history/idempotency repository operations for core credit logic.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–024 (prior scopes retained).
// Entry 043: OpenAI Codex (GPT-6), 2026-10-22 (Asia/Singapore).
// Scope: Added the human-requested scoped entry-ID to internal sequence lookup.
// Changes await human review; prompts/key responses: ../../ai/usage-log.md, entry 043.

import type { Balance__Output as Balance } from '@foc/grpc/dist/generated/credit/Balance';

import type { CreditAccount, CreditHistoryEntry, IdempotencyRecord, Reservation } from '../domains/types';

export interface CreditRepository {
  lockKey(namespace: string, key: string): Promise<void>;
  lockAccounts(userIds: string[]): Promise<void>;
  findIdempotencyRecord<Result = Balance>(operation: string, key: string): Promise<IdempotencyRecord<Result> | undefined>;
  saveIdempotencyRecord<Result>(record: IdempotencyRecord<Result>): Promise<void>;
  findAccount(userId: string): Promise<CreditAccount | undefined>;
  createAccount(account: Pick<CreditAccount, 'userId' | 'totalCredits' | 'reservedCredits'>): Promise<void>;
  saveAccount(account: CreditAccount): Promise<void>;
  findReservation(orderId: string): Promise<Reservation | undefined>;
  createReservation(reservation: Pick<Reservation, 'orderId' | 'requesterId' | 'amount'>): Promise<Reservation>;
  saveReservation(reservation: Reservation): Promise<void>;
  findCreditHistoryEntry(userId: string, type: string): Promise<CreditHistoryEntry | undefined>;
  appendHistory(entry: Omit<CreditHistoryEntry, 'id' | 'createdAt' | 'sequenceId'>): Promise<void>;
  findHistorySequenceId(id: string, userId: string): Promise<string | undefined>;
  findHistoryByUser(userId: string, beforeSequenceId: string | undefined, limit: number): Promise<CreditHistoryEntry[]>;
}
