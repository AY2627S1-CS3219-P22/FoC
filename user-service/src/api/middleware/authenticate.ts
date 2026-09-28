import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Roles } from '@prisma/client';
import { jwtPublicKey } from '../../env';

// Verifies the Bearer JWT and attaches the caller's identity to req.user. Any
// service can run this with the public key alone — no call back to user-service.
// Missing/invalid/expired token → 401 (authentication failure), which is distinct
// from a role failure (403, see requireRole).
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed bearer token.' });
    return;
  }

  try {
    // Always pin the algorithm — never trust the token's own `alg` header
    // (prevents algorithm-confusion attacks). See DECISIONS.md D8.
    const payload = jwt.verify(header.slice('Bearer '.length), jwtPublicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload & { roles: Roles[] };

    req.user = { id: payload.sub as string, roles: payload.roles };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token.' });
  }
};
