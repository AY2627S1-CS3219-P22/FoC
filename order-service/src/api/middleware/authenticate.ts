import type { RequestHandler } from 'express';
import { AuthenticationError, type AuthProvider } from '../../auth/authProvider';

export function authenticate(provider: AuthProvider): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    if (!match) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed bearer token.' });
      return;
    }
    try {
      res.locals.user = await provider.authenticate(match[1]);
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(401).json({ error: 'Unauthorized', message: error.message });
      } else {
        next(error);
      }
    }
  };
}
