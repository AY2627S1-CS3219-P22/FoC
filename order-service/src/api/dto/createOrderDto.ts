import { z } from 'zod';

const supplierId = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .refine(
    (value) => /^[1-9][0-9]*$/.test(value) && BigInt(value) <= 9223372036854775807n,
    'Supplier ID exceeds PostgreSQL bigint range',
  );

export const createOrderSchema = z
  .object({
    supplierId,
    destination: z.string().trim().min(1),
    requestDetails: z.string().trim().min(1),
    credits: z.number().int().positive().max(2147483647),
    expiryTime: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
  })
  .strict();

export const idempotencyKeySchema = z.string().trim().min(1);
export const actionBodySchema = z.object({}).strict();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
