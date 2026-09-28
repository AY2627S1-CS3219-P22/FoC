import type { Roles } from '@prisma/client';

// Augment Express's Request so req.user — set by the `authenticate` middleware —
// is typed everywhere it's read. The import above makes this file a module, so
// the augmentation must go inside `declare global`.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: Roles[] };
    }
  }
}

export {};
