import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../src/auth/authProvider';
import { LocalJwtAuthProvider } from '../src/auth/localJwtAuthProvider';
import { createAuthProvider } from '../src/auth/createAuthProvider';
import { envSchema } from '../src/env';
import { createKeys, signToken } from './helpers';

const keys = createKeys();
const provider = new LocalJwtAuthProvider({ publicKey: keys.publicKey });

test('valid User Service-style JWT yields identity, role array and expiration', async () => {
  const user = await provider.authenticate(signToken(keys.privateKey, 'user-uuid', ['USER', 'ADMINISTRATOR']));
  assert.equal(user.id, 'user-uuid');
  assert.deepEqual(user.roles, ['USER', 'ADMINISTRATOR']);
  assert.ok(user.expiresAt.getTime() > Date.now());
});

test('rejects invalid signatures, malformed tokens and wrong algorithms', async () => {
  const otherKeys = createKeys();
  for (const token of [
    signToken(otherKeys.privateKey),
    'not-a-token',
    jwt.sign({ sub: 'user', roles: ['USER'] }, 'test-secret', { algorithm: 'HS256', expiresIn: '15m' }),
    jwt.sign({ sub: 'user', roles: ['USER'] }, keys.privateKey, { algorithm: 'RS512', expiresIn: '15m' }),
  ]) await assert.rejects(provider.authenticate(token), AuthenticationError);
});

test('requires expiration, subject, and known nonempty role arrays', async () => {
  const exp = Math.floor(Date.now() / 1000) + 900;
  for (const claims of [
    { sub: 'user', roles: ['USER'] },
    { roles: ['USER'], exp },
    { sub: '', roles: ['USER'], exp },
    { sub: ' user ', roles: ['USER'], exp },
    { sub: 'user', exp },
    { sub: 'user', roles: 'USER', exp },
    { sub: 'user', roles: [], exp },
    { sub: 'user', roles: ['SUPPLIER'], exp },
    { sub: 'user', roles: ['USER', 1], exp },
  ]) {
    const token = jwt.sign(claims, keys.privateKey, { algorithm: 'RS256' });
    await assert.rejects(provider.authenticate(token), AuthenticationError);
  }
});

test('rejects expired and not-yet-valid tokens', async () => {
  for (const options of [{ expiresIn: -1 }, { expiresIn: 900, notBefore: 120 }]) {
    const token = jwt.sign({ roles: ['USER'] }, keys.privateKey, { algorithm: 'RS256', subject: 'user', ...options });
    await assert.rejects(provider.authenticate(token), AuthenticationError);
  }
});

test('optional issuer and audience are enforced only when configured', async () => {
  const strict = new LocalJwtAuthProvider({ publicKey: keys.publicKey, issuer: 'foc-user', audience: 'foc-order' });
  await assert.rejects(strict.authenticate(signToken(keys.privateKey)), AuthenticationError);
  const token = jwt.sign({ roles: ['USER'] }, keys.privateKey, {
    algorithm: 'RS256', subject: 'user', expiresIn: '15m', issuer: 'foc-user', audience: 'foc-order',
  });
  assert.equal((await strict.authenticate(token)).id, 'user');
  const wrong = jwt.sign({ roles: ['USER'] }, keys.privateKey, {
    algorithm: 'RS256', subject: 'user', expiresIn: '15m', issuer: 'wrong', audience: 'foc-order',
  });
  await assert.rejects(strict.authenticate(wrong), AuthenticationError);
});

test('unsupported auth provider fails before reading any key', () => {
  assert.throws(() => createAuthProvider({ AUTH_PROVIDER: 'user-service', USER_SERVICE_PUBLIC_KEY_PATH: '/missing' }), /Unsupported AUTH_PROVIDER/);
  const config = { DATABASE_URL: 'postgresql://localhost/order', USER_SERVICE_PUBLIC_KEY_PATH: 'public.pem' };
  assert.equal(envSchema.parse(config).AUTH_PROVIDER, 'local');
  assert.equal(envSchema.parse(config).PORT, 3002);
  assert.equal(envSchema.safeParse({ ...config, AUTH_PROVIDER: 'user-service' }).success, false);
  assert.equal(envSchema.safeParse({ ...config, DATABASE_URL: 'https://localhost' }).success, false);
});

test('missing or unusable verification key fails configuration', () => {
  assert.throws(() => createAuthProvider({ AUTH_PROVIDER: 'local', USER_SERVICE_PUBLIC_KEY_PATH: '/missing-foc-key.pem' }));
  assert.throws(() => new LocalJwtAuthProvider({ publicKey: 'not a PEM key' }));
});
