import {Request, Response, NextFunction} from "express";

import jwt from 'jsonwebtoken';
import fs from 'node:fs';

const PUBLIC_KEY = fs.readFileSync(process.env.USER_SERVICE_PUBLIC_KEY_PATH!, 'utf8');

// Same claim values the user service puts on RS256 tokens
export const USER = 'USER';
export const ADMIN = 'ADMIN';
export type Role = typeof USER | typeof ADMIN;

declare global {
    namespace Express {
    interface Request {
      user?: { id: string; roles: Role[] };
    }
  }
}

export function authenticate(req:Request, res:Response, next:NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), PUBLIC_KEY, { algorithms: ['RS256'] }) as jwt.JwtPayload & { roles?: Role[] };
    // pin RS256
    if (typeof payload.sub !== 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: payload.sub, roles: payload.roles ?? [] };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export const requireRole = (...allowed: Role[]) => (req:Request, res:Response, next: NextFunction) =>
  req.user?.roles?.some((r) => allowed.includes(r))
    ? next()
    : res.status(403).json({ error: 'Forbidden' });

