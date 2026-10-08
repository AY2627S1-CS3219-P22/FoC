import type { RequestHandler } from 'express';
import { z } from 'zod';

// Reusable middleware: validates req.body against a zod schema.
export function validate(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: z.flattenError(result.error).fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
