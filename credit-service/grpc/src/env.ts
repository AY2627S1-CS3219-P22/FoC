import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  GRPC_HOST: z.string().min(1).default('127.0.0.1'),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CREDIT_USER_SERVICE_TOKEN: z.string().min(32).optional(),
  CREDIT_ORDER_SERVICE_TOKEN: z.string().min(32).optional(),
  CREDIT_FRONTEND_SERVICE_TOKEN: z.string().min(32).optional(),
  CREDIT_ADMIN_SERVICE_TOKEN: z.string().min(32).optional(),
  CREDIT_USER_JWT_PUBLIC_KEY_PATH: z.string().min(1).optional(),
  CREDIT_USER_JWT_ISSUER: z.string().min(1).optional(),
  CREDIT_USER_JWT_AUDIENCE: z.string().min(1).optional(),
  CREDIT_TLS_CERT_PATH: z.string().min(1).optional(),
  CREDIT_TLS_KEY_PATH: z.string().min(1).optional(),
  GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50053),
  GRPC_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  USER_GRPC_ADDR: z.string().min(1).default('localhost:50052'),
  ORDER_GRPC_ADDR: z.string().min(1).default('localhost:50051'),
  CREDIT_GRPC_ADDR: z.string().min(1).default('localhost:50053'),
  SUPPLIER_GRPC_ADDR: z.string().min(1).default('localhost:50054'),
});

export const env = schema.parse(process.env);
if (![env.CREDIT_USER_SERVICE_TOKEN, env.CREDIT_ORDER_SERVICE_TOKEN, env.CREDIT_FRONTEND_SERVICE_TOKEN, env.CREDIT_ADMIN_SERVICE_TOKEN].some(Boolean)) {
  throw new Error('Configure scoped credit service credentials; run npm run security:setup --workspace @foc/credit-grpc for local setup');
}
if (Boolean(env.CREDIT_TLS_CERT_PATH) !== Boolean(env.CREDIT_TLS_KEY_PATH)) {
  throw new Error('Both CREDIT_TLS_CERT_PATH and CREDIT_TLS_KEY_PATH are required for TLS');
}
if ((env.NODE_ENV === 'production' || !['127.0.0.1', 'localhost', '::1'].includes(env.GRPC_HOST)) && !env.CREDIT_TLS_CERT_PATH) {
  throw new Error('TLS is required for production or non-localhost credit gRPC listeners');
}
