/*
globalSetup runs in its own process, so the container URI has to be re-published
into each worker's env. This file runs before any test module is imported, which
matters because src/database/db.ts builds its Pool at import time.
*/

import { generateKeyPairSync } from 'node:crypto';
import { inject } from 'vitest';

process.env.DATABASE_URL = inject('databaseUrl');

/*
The user service owns the real signing key, so tests mint their own throwaway
pair: the public half goes where the auth middleware looks for it, and the
private half is used by tests/helpers/auth-token.ts to sign test tokens.
Generating it here rather than committing a fixture keeps a usable signing key
out of the repository.
*/
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.JWT_PUBLIC_KEY = publicKey;
process.env.TEST_JWT_PRIVATE_KEY = privateKey;
