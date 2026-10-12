import { readFileSync } from 'node:fs';
import type { AuthProvider } from './authProvider';
import { LocalJwtAuthProvider } from './localJwtAuthProvider';

export interface AuthConfiguration {
  AUTH_PROVIDER: string;
  USER_SERVICE_PUBLIC_KEY_PATH: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
}

export function createAuthProvider(config: AuthConfiguration): AuthProvider {
  if (config.AUTH_PROVIDER !== 'local') {
    throw new Error(`Unsupported AUTH_PROVIDER "${config.AUTH_PROVIDER}". Only local verification is implemented.`);
  }
  return new LocalJwtAuthProvider({
    publicKey: readFileSync(config.USER_SERVICE_PUBLIC_KEY_PATH, 'utf8'),
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });
}
