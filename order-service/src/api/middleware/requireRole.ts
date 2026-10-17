import type { RequestHandler } from 'express';
import type { AuthenticatedUser, Role } from '../../auth/authProvider';

export function requireRole(...allowed: Role[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
      return;
    }
    if (!user.roles.some((role) => allowed.includes(role))) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient role.' });
      return;
    }
    next();
  };
}
