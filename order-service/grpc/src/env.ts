import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  GRPC_HOST: z.string().min(1).default('0.0.0.0'),
  GRPC_PORT: z.coerce.number().int().min(1).max(65535).default(50051),
  GRPC_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  USER_GRPC_ADDR: z.string().min(1).default('localhost:50052'),
  ORDER_GRPC_ADDR: z.string().min(1).default('localhost:50051'),
  CREDIT_GRPC_ADDR: z.string().min(1).default('localhost:50053'),
  SUPPLIER_GRPC_ADDR: z.string().min(1).default('localhost:50054'),
});

export const env = schema.parse(process.env);
