import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value), 'PostgreSQL URL required'),
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
