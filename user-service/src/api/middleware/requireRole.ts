import type { RequestHandler } from 'express';
import type { Roles } from '@prisma/client';

// RBAC guard: allow the request only if the caller holds at least one of the
// given roles. Must run *after* `authenticate` (it reads req.user). An
// authenticated caller lacking the role gets 403 Forbidden — distinct from the
// 401 that `authenticate` returns for a missing/invalid token.
export function requireRole(...allowed: Roles[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return;
    }
    if (!req.user.roles.some((role) => allowed.includes(role))) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient role.' });
      return;
    }
    next();
  };
}
