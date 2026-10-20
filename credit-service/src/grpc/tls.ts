// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Enforced the human's gRPC TLS requirement outside explicitly configured local use.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–024 (prior scopes retained).

import { readFile } from 'node:fs/promises';
import { ServerCredentials } from '@grpc/grpc-js';

export async function grpcCredentials(local: boolean, certificatePath?: string, keyPath?: string) {
  if (certificatePath && keyPath) {
    const [cert_chain, private_key] = await Promise.all([readFile(certificatePath), readFile(keyPath)]);
    return ServerCredentials.createSsl(null, [{ cert_chain, private_key }], false);
  }
  if (!local || certificatePath || keyPath) {
    throw new Error('gRPC TLS certificate and key are required outside local use');
  }
  return ServerCredentials.createInsecure();
}
