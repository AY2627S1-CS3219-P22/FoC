import { readFileSync } from 'node:fs';
import { credentials, Metadata } from '@grpc/grpc-js';
import { createCreditClient, type RpcOptions } from '@foc/grpc';
import { retryCreditRpc } from './retryCreditRpc';
import { createCreditGateway } from './creditGateway';

export interface CreditConfiguration {
  CREDIT_GRPC_ADDR?: string;
  CREDIT_ORDER_SERVICE_TOKEN?: string;
  CREDIT_GRPC_CA_PATH?: string;
  CREDIT_RPC_TIMEOUT_MS: number;
}
export function configuredCreditGateway(config: CreditConfiguration) {
  if (!config.CREDIT_GRPC_ADDR) return undefined;
  if (!config.CREDIT_ORDER_SERVICE_TOKEN) throw new Error('Credit service credential is required');
  const loopback = /^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/.test(config.CREDIT_GRPC_ADDR);
  if (!config.CREDIT_GRPC_CA_PATH && (!loopback || process.env.NODE_ENV === 'production'))
    throw new Error('Credit TLS CA is required outside loopback development');
  // Order owns retries so this works with shared clients with or without retries.
  const clientConfig = {
    timeoutMs: config.CREDIT_RPC_TIMEOUT_MS,
    retry: { maxAttempts: 1 },
    credentials: config.CREDIT_GRPC_CA_PATH
      ? credentials.createSsl(readFileSync(config.CREDIT_GRPC_CA_PATH))
      : credentials.createInsecure(),
  };
  const client = createCreditClient(config.CREDIT_GRPC_ADDR, clientConfig);
  const retryingClient = {
    getBalance: (input: { userId: string }, options: RpcOptions) =>
      retryCreditRpc(() => client.getBalance(input, options), options),
    reserveCredits: (input: { orderId: string; requesterId: string; amount: number }, options: RpcOptions) =>
      retryCreditRpc(() => client.reserveCredits(input, options), options),
    releaseCredits: (input: { orderId: string }, options: RpcOptions) =>
      retryCreditRpc(() => client.releaseCredits(input, options), options),
    settleCredits: (input: { orderId: string; courierId: string }, options: RpcOptions) =>
      retryCreditRpc(() => client.settleCredits(input, options), options),
    getReservation: (input: { orderId: string }, options: RpcOptions) =>
      retryCreditRpc(() => client.getReservation(input, options), options),
  };
  return {
    gateway: createCreditGateway(retryingClient, () => {
      const metadata = new Metadata();
      metadata.set('x-credit-service-token', config.CREDIT_ORDER_SERVICE_TOKEN!);
      // All attempts share this deadline, metadata and identical request fields.
      return { metadata, deadline: Date.now() + config.CREDIT_RPC_TIMEOUT_MS };
    }),
    close: () => client.close(),
  };
}
