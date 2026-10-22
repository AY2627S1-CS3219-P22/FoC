// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Removed Credit CA environment setting per team decision.
// Author review: Pending; see ../usage-log.md.
import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value), 'PostgreSQL URL required'),
  CREDIT_GRPC_ADDR: z.string().regex(/^(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\]):[0-9]+$/).optional(),
  CREDIT_ORDER_SERVICE_TOKEN: z.string().trim().min(1).optional(),
  CREDIT_RPC_TIMEOUT_MS: z.coerce.number().int().positive().max(60000).default(3000),
  PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  AUTH_PROVIDER: z.literal('local').default('local'),
  USER_SERVICE_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_ISSUER: z.string().min(1).optional(),
  JWT_AUDIENCE: z.string().min(1).optional(),
});

// Parsed by startup, not import, so tests can inject dependencies without keys.
export function readEnvironment() {
  return envSchema.parse(process.env);
}
