import { CreditService, createServer, unimplemented, type CreditServiceHandlers } from '@foc/grpc';

export const handlers: CreditServiceHandlers = {
  GetBalance: unimplemented('GetBalance'),
  ReserveCredits: unimplemented('ReserveCredits'),
  ReleaseCredits: unimplemented('ReleaseCredits'),
  SettleCredits: unimplemented('SettleCredits'),
};

export function createGrpcServer() {
  return createServer(CreditService.service, handlers);
}
