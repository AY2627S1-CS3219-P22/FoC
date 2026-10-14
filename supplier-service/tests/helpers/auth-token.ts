/*
Mints tokens that stand in for the ones the user service issues, signed with the
throwaway key pair created in tests/setup-env.ts.

ALERT: AI assisted programming
*/

import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';

type TokenOptions = {
  id?: string;
  //seconds; negative values produce an already-expired token
  expiresIn?: number;
  roles?: string[];
};

export function signTestToken({
  id = 'test-user',
  expiresIn = 300,
  roles = ['ADMINISTRATOR'],
}: TokenOptions = {}): string {
  return jwt.sign({ roles }, process.env.TEST_JWT_PRIVATE_KEY as string, {
    algorithm: 'RS256',
    subject: id,
    expiresIn,
  });
}

export const adminBearer = () => `Bearer ${signTestToken()}`;
export const userBearer = () => `Bearer ${signTestToken({ roles: ['USER'] })}`;

/*
Correctly formed and signed, but by a key this service has no reason to trust.
Verification has to fail on the signature rather than on the token's shape.
*/
export function foreignBearer(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const token = jwt.sign({}, privateKey, {
    algorithm: 'RS256',
    subject: 'impostor',
    expiresIn: 300,
  });

  return `Bearer ${token}`;
}
