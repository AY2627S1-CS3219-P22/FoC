import { status, type handleUnaryCall, type ServerErrorResponse } from '@grpc/grpc-js';
import { CreditService as Contract, createServer, type CreditServiceHandlers } from '@foc/grpc';
import { CreditError } from '../domain/errors';
import type { CreditService } from '../services/credit-service';
import { CreditController } from '../controllers/credit-controller';
import { CreditAccessError, CreditAuthorizer, type CreditRpc, type CreditSecurityConfig } from '../security/credit-authorizer';

function rpcError(error: unknown): Pick<ServerErrorResponse, 'code' | 'details'> {
  if (error instanceof CreditError) return { code: status[error.code], details: error.message };
  if (error instanceof CreditAccessError) return { code: error.code, details: error.message };
  const code = (error as { code?: string } | null)?.code;
  if (typeof code === 'string' && ['40001', '40P01', '55P03', '57014'].includes(code)) {
    return { code: status.ABORTED, details: 'Credit operation was interrupted; retry with the same idempotency key' };
  }
  if (typeof code === 'string' && (code.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01', '57P02', '57P03'].includes(code))) {
    return { code: status.UNAVAILABLE, details: 'Credit database unavailable; retry with the same idempotency key' };
  }
  console.error('Credit operation failed', error instanceof Error ? error.name : 'Unknown error');
  return { code: status.INTERNAL, details: 'Credit operation failed' };
}

function unary<Request, Response>(rpc: CreditRpc, action: (request: Request) => Promise<Response>, authorizer: CreditAuthorizer): handleUnaryCall<Request, Response> {
  return (call, callback) => {
    try { authorizer.authorize(rpc, call.metadata, call.request); }
    catch (error) { callback(rpcError(error)); return; }
    void action(call.request).then(result => callback(null, result), error => callback(rpcError(error)));
  };
}

export function createGrpcServer(service: CreditService, security: CreditSecurityConfig = { serviceTokens: {} }) {
  const controller = new CreditController(service);
  const authorizer = new CreditAuthorizer(security);
  const handlers: CreditServiceHandlers = {
    InitCredits: unary('InitCredits', request => controller.initCredits(request), authorizer),
    GetBalance: unary('GetBalance', request => controller.getCreditBalance(request), authorizer),
    GetCreditHistory: unary('GetCreditHistory', request => controller.getCreditHistory(request), authorizer),
    ReserveCredits: unary('ReserveCredits', request => controller.reserveCredits(request), authorizer),
    UpdateReservation: unary('UpdateReservation', request => controller.updateCredits(request), authorizer),
    ReleaseCredits: unary('ReleaseCredits', request => controller.releaseCredits(request), authorizer),
    SettleCredits: unary('SettleCredits', request => controller.transferCredits(request), authorizer),
  };
  return createServer(Contract.service, handlers);
}
