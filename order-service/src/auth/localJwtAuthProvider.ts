import { createPublicKey, type KeyObject } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthenticationError, ROLES, type AuthProvider, type AuthenticatedUser } from './authProvider';

const claimsSchema = z.object({
  sub: z.string().min(1).refine((value) => value === value.trim(), 'Invalid subject'),
  roles: z.array(z.enum(ROLES)).min(1),
  exp: z.number().int().positive().max(8_640_000_000_000),
});

export interface LocalJwtOptions {
  publicKey: string;
  issuer?: string;
  audience?: string;
}

export class LocalJwtAuthProvider implements AuthProvider {
  private readonly publicKey: KeyObject;

  constructor(private readonly options: LocalJwtOptions) {
    this.publicKey = createPublicKey(options.publicKey);
    if (this.publicKey.asymmetricKeyType !== 'rsa') {
      throw new Error('JWT verification requires an RSA public key.');
    }
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    try {
      const verified = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        ...(this.options.issuer ? { issuer: this.options.issuer } : {}),
        ...(this.options.audience ? { audience: this.options.audience } : {}),
      });
      const claims = claimsSchema.parse(verified);
      return { id: claims.sub, roles: claims.roles, expiresAt: new Date(claims.exp * 1000) };
    } catch {
      throw new AuthenticationError();
    }
  }
}
