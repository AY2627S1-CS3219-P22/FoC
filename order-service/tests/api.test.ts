import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/api/app';
import { LocalJwtAuthProvider } from '../src/auth/localJwtAuthProvider';
import { createKeys, signToken } from './helpers';

const keys = createKeys();
let server: Server;
let baseUrl: string;
let dbUp = true;
let calls = 0;
const id = '00000000-0000-4000-8000-000000000001';

before(async () => {
  const app = createApp({
    authProvider: new LocalJwtAuthProvider({ publicKey: keys.publicKey }),
    pingDatabase: async () => dbUp,
    orders: {
      async listOrders(user, scope) {
        calls++;
        if (scope === 'all' && !user.roles.includes('ADMINISTRATOR')) return { ok: false, reason: 'forbidden' };
        if (scope !== 'all' && !user.roles.includes('USER')) return { ok: false, reason: 'forbidden' };
        return { ok: true, value: [] };
      },
      async getOrder(user) {
        calls++;
        return { ok: false, reason: user.id === 'requester' ? 'not-found' : 'forbidden' };
      },
    },
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function get(path: string, token = signToken(keys.privateKey)) {
  return fetch(baseUrl + path, { headers: { Authorization: `Bearer ${token}` } });
}

test('health reports database success and failure without authentication', async () => {
  let response = await fetch(baseUrl + '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', db: 'up' });
  dbUp = false;
  response = await fetch(baseUrl + '/health');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'degraded', db: 'down' });
  dbUp = true;
});

test('missing/malformed/expired auth is rejected before calling services', async () => {
  const previous = calls;
  const cases: Record<string, string>[] = [{}, { Authorization: 'Basic token' }, { Authorization: 'Bearer bad token' }];
  for (const headers of cases) {
    assert.equal((await fetch(baseUrl + '/orders', { headers })).status, 401);
  }
  assert.equal((await get('/orders', 'invalid')).status, 401);
  const expired = jwtExpired();
  assert.equal((await get('/orders', expired)).status, 401);
  assert.equal(calls, previous);
});

function jwtExpired() {
  // Expiration validation itself is covered in auth.test; keep HTTP wiring real.
  return jwt.sign({ roles: ['USER'] }, keys.privateKey, { algorithm: 'RS256', subject: 'user', expiresIn: -1 });
}

test('list scopes validate input and distinguish student/admin authorization', async () => {
  for (const scope of ['open', 'requested', 'assigned']) {
    const response = await get(`/orders?scope=${scope}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { orders: [] });
  }
  assert.equal((await get('/orders')).status, 200);
  assert.equal((await get('/orders?scope=all')).status, 403);
  assert.equal((await get('/orders?scope=all', signToken(keys.privateKey, 'admin', ['ADMINISTRATOR']))).status, 200);
  assert.equal((await get('/orders?scope=open', signToken(keys.privateKey, 'admin', ['ADMINISTRATOR']))).status, 403);
  const previous = calls;
  assert.equal((await get('/orders?scope=other')).status, 400);
  assert.equal((await get('/orders?scope=open&scope=all')).status, 400);
  assert.equal(calls, previous);
});

test('detail validates UUID and maps missing/forbidden outcomes', async () => {
  const previous = calls;
  assert.equal((await get('/orders/not-a-uuid')).status, 400);
  assert.equal(calls, previous);
  assert.equal((await get(`/orders/${id}`)).status, 404);
  assert.equal((await get(`/orders/${id}`, signToken(keys.privateKey, 'stranger'))).status, 403);
});

test('creation and lifecycle endpoints are unavailable in Phase 1', async () => {
  for (const path of ['/orders', `/orders/${id}/accept`, `/orders/${id}/deliver`, `/orders/${id}/cancel`]) {
    const response = await fetch(baseUrl + path, { method: 'POST', headers: { Authorization: `Bearer ${signToken(keys.privateKey)}` } });
    assert.equal(response.status, 404);
  }
});
