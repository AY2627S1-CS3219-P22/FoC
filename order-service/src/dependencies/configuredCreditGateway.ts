// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Changed Order-to-Credit transport to plaintext; service token unchanged.
// Author review: Pending; see ../../usage-log.md.
import { credentials, Metadata } from '@grpc/grpc-js';
import { createCreditClient } from '@foc/grpc';
import { createCreditGateway } from './creditGateway';

export interface CreditConfiguration {
  CREDIT_GRPC_ADDR?: string;
  CREDIT_ORDER_SERVICE_TOKEN?: string;
  CREDIT_RPC_TIMEOUT_MS: number;
}
export function configuredCreditGateway(config: CreditConfiguration) {
  if (!config.CREDIT_GRPC_ADDR) return undefined;
  if (!config.CREDIT_ORDER_SERVICE_TOKEN) throw new Error('Credit service credential is required');
  const clientConfig = {
    timeoutMs: config.CREDIT_RPC_TIMEOUT_MS,
    credentials: credentials.createInsecure(),
  };
  const client = createCreditClient(config.CREDIT_GRPC_ADDR, clientConfig);
  return {
    gateway: createCreditGateway(client, () => {
      const metadata = new Metadata();
      metadata.set('x-credit-service-token', config.CREDIT_ORDER_SERVICE_TOKEN!);
      // All attempts share this deadline, metadata and identical request fields.
      return { metadata, deadline: Date.now() + config.CREDIT_RPC_TIMEOUT_MS };
    }),
    close: () => client.close(),
  };
}
