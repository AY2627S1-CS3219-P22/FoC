// AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
// Scope: CSV catalogue lookup and user-defined search contract; review pending.
// See ../../../usage-log.md.
import type { Prisma, PrismaClient } from '../generated/prisma';
import { z } from 'zod';
import type { RequestHandler } from 'express';

type Database = Pick<Prisma.TransactionClient, 'destinationLocation'>;

// Exact names remain supported for existing clients, but must exist in the catalogue.
// An ID/name mismatch is rejected rather than saving caller-supplied display text.
export async function resolveDestination(db: Database, name: string, id?: string) {
  const location = id
    ? await db.destinationLocation.findUnique({ where: { id } })
    : await db.destinationLocation.findFirst({ where: { name }, orderBy: { id: 'asc' } });
  return location && location.name === name ? location : null;
}

const querySchema = z.object({
  query: z.string().trim().min(1),
  limit: z.string().regex(/^[0-9]+$/).transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
}).strict();

export function searchLocations(db: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      const missingQuery = typeof req.query.query !== 'string' || !req.query.query.trim();
      res.status(400).json({ error: { message: missingQuery
        ? 'Search query must not be empty.' : 'Limit must be an integer between 1 and 50, with no unknown parameters.' } });
      return;
    }
    try {
      // Escape LIKE metacharacters so typed % and _ are literal search text.
      const term = parsed.data.query.replace(/[\\%_]/g, '\\$&');
      const locations = await db.destinationLocation.findMany({
        where: { OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { aliases: { contains: term, mode: 'insensitive' } },
        ] },
        select: { id: true, name: true, code: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }], take: parsed.data.limit ?? 20,
      });
      res.json({ locations });
    } catch (error) { next(error); }
  };
}
