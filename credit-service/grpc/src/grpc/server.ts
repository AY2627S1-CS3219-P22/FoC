// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-25.
// Scope: Keep existing scaffold type-compatible with agreed six-RPC contract only.
// Human review pending; see order-service/usage-log.md (repository root).
import { CreditService, createServer, unimplemented, type CreditServiceHandlers } from '@foc/grpc';

export const handlers: CreditServiceHandlers = {
  GetBalance: unimplemented('GetBalance'),
  ReserveCredits: unimplemented('ReserveCredits'),
  GetReservation: unimplemented('GetReservation'),
  UpdateReservation: unimplemented('UpdateReservation'),
  ReleaseCredits: unimplemented('ReleaseCredits'),
  SettleCredits: unimplemented('SettleCredits'),
};

export function createGrpcServer() {
  return createServer(CreditService.service, handlers);
}
