// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
// Scope: Relocated the existing RS256 user-token verifier into the human-specified REST folder.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../../ai/usage-log.md, entries 005–024 (prior scopes retained).

import { createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';

export class AuthenticationError extends Error {}

export function userTokenVerifier(publicKeyPem: string) {
  const publicKey = createPublicKey(publicKeyPem);
  if (publicKey.asymmetricKeyType !== 'rsa') throw new Error('User Service public key must be RSA');
  return (authorization: unknown): string => {
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing bearer token');
    }
    try {
      const payload = jwt.verify(authorization.slice(7), publicKey, { algorithms: ['RS256'] });
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || payload.sub.length === 0
        || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) {
        throw new Error('Missing subject or expiration');
      }
      return payload.sub;
    } catch {
      throw new AuthenticationError('Invalid or expired bearer token');
    }
  };
}
