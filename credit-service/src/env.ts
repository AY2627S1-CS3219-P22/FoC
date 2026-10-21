// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Configured human-specified order-service tokens, local/TLS transport, REST port, and User Service public-key path.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../ai/usage-log.md, entries 005–024 (prior scopes retained).

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  GRPC_HOST: z.string().min(1).default('0.0.0.0'),
  GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50054),
  CREDIT_ORDER_SERVICE_TOKEN: z.string().min(1),
  CREDIT_LOCAL_MODE: z.enum(['true', 'false']).default('false'),
  CREDIT_TLS_CERT_PATH: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  CREDIT_TLS_KEY_PATH: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  CREDIT_JWT_PUBLIC_KEY_PATH: z.string().min(1).default('../user-service/keys/public.pem'),
  HTTP_HOST: z.string().min(1).default('0.0.0.0'),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3004),
});

export const env = schema.parse(process.env);
