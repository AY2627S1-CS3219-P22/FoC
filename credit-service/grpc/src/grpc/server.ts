// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Added unimplemented handlers for all human-finalized credit RPCs, including initialization, reservation, and history additions.
// Author review: Pending human review.
// Prompts and key responses: ../../../ai/usage-log.md, entries 010–012.
// AI-generated additions; human review pending.

import { CreditService, createServer, unimplemented, type CreditServiceHandlers } from '@foc/grpc';

export const handlers: CreditServiceHandlers = {
  InitCredits: unimplemented('InitCredits'),
  GetBalance: unimplemented('GetBalance'),
  GetUserCreditHistory: unimplemented('GetUserCreditHistory'),
  GetOrderCreditHistory: unimplemented('GetOrderCreditHistory'),
  ReserveCredits: unimplemented('ReserveCredits'),
  UpdateReservation: unimplemented('UpdateReservation'),
  ReleaseCredits: unimplemented('ReleaseCredits'),
  SettleCredits: unimplemented('SettleCredits'),
  GetReservation: unimplemented('GetReservation'),
};

export function createGrpcServer() {
  return createServer(CreditService.service, handlers);
}
