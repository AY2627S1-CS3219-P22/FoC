// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
// Scope: Relocated the existing peer-client helper to the human-specified src/grpc directory; behavior unchanged.
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entry 024.

import { createPeerClients } from '@foc/grpc';
import { env } from '../env';

// Reuse these channels across requests; close them during shutdown.
export function createClients() {
  return createPeerClients(
    {
      user: env.USER_GRPC_ADDR,
      order: env.ORDER_GRPC_ADDR,
      credit: env.CREDIT_GRPC_ADDR,
      supplier: env.SUPPLIER_GRPC_ADDR,
    },
    { timeoutMs: env.GRPC_TIMEOUT_MS },
  );
}
