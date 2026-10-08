import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

const grpcDir = path.dirname(fileURLToPath(import.meta.url));
//REST .env holds DATABASE_URL; grpc/.env (cwd) can override ports
config({ path: path.resolve(grpcDir, '../../.env.example') });
config();

const schema = z.object({
  GRPC_HOST: z.string().min(1).default('0.0.0.0'),
  GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50054),
  GRPC_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  USER_GRPC_ADDR: z.string().min(1).default('localhost:50052'),
  ORDER_GRPC_ADDR: z.string().min(1).default('localhost:50051'),
  CREDIT_GRPC_ADDR: z.string().min(1).default('localhost:50053'),
  SUPPLIER_GRPC_ADDR: z.string().min(1).default('localhost:50054'),
});

export const env = schema.parse(process.env);
