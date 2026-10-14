import {Request, Response, NextFunction} from "express";

import jwt from 'jsonwebtoken';
import fs from 'node:fs';

const PUBLIC_KEY = fs.readFileSync(process.env.USER_SERVICE_PUBLIC_KEY_PATH!, 'utf8');

//user-service JWT claim; keep the name ADMIN so routes read requireRole(ADMIN)
export const ADMIN = 'ADMINISTRATOR';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[] };
    }
  }
}

export function authenticate(req:Request, res:Response, next:NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), PUBLIC_KEY, { algorithms: ['RS256'] }) as jwt.JwtPayload & { roles?: string[] };
    // pin RS256
    if (typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: payload.sub, roles: payload.roles ?? [] }; //needs to be solved because it is a custom claim no roles should fail                               // same contract
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

//must run after authenticate; 401 if there is no req.user, 403 if none of the roles match
export const requireRole = (...allowed: string[]) => (req:Request, res:Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return req.user.roles.some((r) => allowed.includes(r))
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
};

