import { timingSafeEqual } from 'node:crypto';
import { status, type handleUnaryCall, type ServerErrorResponse } from '@grpc/grpc-js';
import { CreditService as Contract, createServer, type CreditServiceHandlers } from '@foc/grpc';
import { CreditError } from '../domain/errors';
import type { CreditService } from '../services/credit-service';
import { CreditController } from '../controllers/credit-controller';

function rpcError(error: unknown): Pick<ServerErrorResponse, 'code' | 'details'> {
  if (error instanceof CreditError) return { code: status[error.code], details: error.message };
  const code = (error as { code?: string } | null)?.code;
  if (typeof code === 'string' && ['40001', '40P01', '55P03', '57014'].includes(code)) {
    return { code: status.ABORTED, details: 'Credit operation was interrupted' };
  }
  if (typeof code === 'string' && (code.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', '57P01', '57P02', '57P03'].includes(code))) {
    return { code: status.UNAVAILABLE, details: 'Credit database unavailable' };
  }
  console.error('Credit operation failed', error instanceof Error ? error.name : 'Unknown error');
  return { code: status.INTERNAL, details: 'Credit operation failed' };
}

function unary<Request, Response>(action: (request: Request) => Promise<Response>, token: string): handleUnaryCall<Request, Response> {
  return (call, callback) => {
    const values = call.metadata.get('x-credit-service-token');
    const actual = values.length === 1 && typeof values[0] === 'string' ? Buffer.from(values[0]) : Buffer.alloc(0);
    const expected = Buffer.from(token);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      callback({ code: status.UNAUTHENTICATED, details: 'Valid service credentials required' });
      return;
    }
    void action(call.request).then(result => callback(null, result), error => callback(rpcError(error)));
  };
}

export function createGrpcServer(service: CreditService, token: string) {
  const controller = new CreditController(service);
  if (!token || token.length < 32) throw new Error('Credit service token must be at least 32 characters');
  const handlers: CreditServiceHandlers = {
    InitCredits: unary(request => controller.initCredits(request), token),
    GetBalance: unary(request => controller.getCreditBalance(request), token),
    GetCreditHistory: unary(request => controller.getCreditHistory(request), token),
    ReserveCredits: unary(request => controller.reserveCredits(request), token),
    UpdateReservation: unary(request => controller.updateCredits(request), token),
    ReleaseCredits: unary(request => controller.releaseCredits(request), token),
    SettleCredits: unary(request => controller.transferCredits(request), token),
  };
  return createServer(Contract.service, handlers);
}
