import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser, Role } from '../src/auth/authProvider';

export function createKeys() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

export function signToken(privateKey: string, id = 'requester', roles: Role[] = ['USER']) {
  return jwt.sign({ roles }, privateKey, { algorithm: 'RS256', subject: id, expiresIn: '15m' });
}

export function identity(id: string, roles: Role[] = ['USER']): AuthenticatedUser {
  return { id, roles, expiresAt: new Date(Date.now() + 900_000) };
}
