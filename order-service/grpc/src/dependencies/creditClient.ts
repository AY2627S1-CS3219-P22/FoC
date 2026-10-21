// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Implemented author-approved Order validation/authentication/RPC integration.
// Author review: Pending; see ../../../usage-log.md.
import path from 'node:path';
import { loadSync } from '@grpc/proto-loader';
import { credentials, loadPackageDefinition, Metadata, status, type ServiceClientConstructor, type ServiceError } from '@grpc/grpc-js';
import { z } from 'zod';

const reservationSchema = z.object({
  orderId: z.uuid(), requesterId: z.string().min(1), amount: z.number().int().positive(),
  status: z.enum(['RESERVED', 'RELEASED', 'SETTLED']),
  reservationId: z.string().min(1), version: z.number().int().positive(), courierId: z.string().optional(),
});
const balanceSchema = z.object({
  userId: z.string().min(1), availableCredits: z.number().int().nonnegative(),
  reservedCredits: z.number().int().nonnegative(), totalCredits: z.number().int().nonnegative(),
});
const definition = loadSync(path.resolve(__dirname, '../../proto/credit.proto'), {
  keepCase: false, longs: String, enums: String, defaults: true, oneofs: true,
});
const contract = loadPackageDefinition(definition) as unknown as { credit: { CreditService: ServiceClientConstructor } };

export function createCreditClient(address: string, token: string, timeoutMs: number, ca?: Buffer) {
  if (!token.trim() || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid Credit configuration');
  const client = new contract.credit.CreditService(address, ca ? credentials.createSsl(ca) : credentials.createInsecure());
  const methods = contract.credit.CreditService.service;
  async function call<T>(name: string, input: object, schema: z.ZodType<T>): Promise<T> {
    const method = methods[name];
    const metadata = new Metadata(); metadata.set('x-credit-service-token', token);
    const response = await new Promise<unknown>((resolve, reject) => {
      client.makeUnaryRequest(method.path, method.requestSerialize, method.responseDeserialize, input,
        metadata, { deadline: Date.now() + timeoutMs }, (error, value) => error ? reject(error) : resolve(value));
    });
    return schema.parse(response);
  }
  return {
    getBalance: (input: { userId: string }) => call('GetBalance', input, balanceSchema),
    getReservation: (input: { orderId: string }) => call('GetReservation', input, reservationSchema),
    reserveCredits: (input: { orderId: string; requesterId: string; amount: number }) => call('ReserveCredits', input, reservationSchema),
    updateReservation: (input: { orderId: string; amount: number; expectedVersion: number }) => call('UpdateReservation', input, reservationSchema),
    releaseCredits: (input: { orderId: string }) => call('ReleaseCredits', input, reservationSchema),
    settleCredits: (input: { orderId: string; courierId: string }) => call('SettleCredits', input, reservationSchema),
    close: () => client.close(),
  };
}

export function classifyCreditError(error: unknown): 'rejected' | 'unavailable' | 'uncertain' {
  const code = (error as Partial<ServiceError> | null)?.code;
  if (code === status.INVALID_ARGUMENT || code === status.FAILED_PRECONDITION || code === status.NOT_FOUND) return 'rejected';
  if (code === status.UNAUTHENTICATED || code === status.PERMISSION_DENIED || code === status.UNIMPLEMENTED) return 'unavailable';
  return 'uncertain';
}
