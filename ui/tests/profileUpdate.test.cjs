const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadVisibleCreditHistory } = require('../api/credits.ts');

test('update profile sends PATCH /users/me with name and username', async t => {
  const { updateMe } = require('../api/users.ts');
  const fetchBefore = global.fetch;
  const storageBefore = global.localStorage;
  t.after(() => { global.fetch = fetchBefore; global.localStorage = storageBefore; });
  global.localStorage = { getItem: () => 'token' };
  const profile = { firstName: 'B', lastName: 'Tester', username: 'btester' };
  global.fetch = async (url, options) => {
    assert.equal(url, '/backend/users/me');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(options.body), profile);
    return { ok: true, status: 200, json: async () => ({ user: { ...profile, id: 'user-id', email: 'b@u.nus.edu', roles: ['USER'], createdAt: '2026-11-01T00:00:00Z' } }) };
  };
  const user = await updateMe(profile);
  assert.equal(user.username, 'btester');
  assert.equal(user.firstName, 'B');
});

test('credit history pages only payments and keeps a bookmark for the next page', async t => {
  const fetchBefore = global.fetch;
  const storageBefore = global.localStorage;
  t.after(() => { global.fetch = fetchBefore; global.localStorage = storageBefore; });
  global.localStorage = { getItem: () => 'token' };
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const entry = (n, type) => ({ id: id(n), orderId: null, type, totalAmountChange: 1, totalReservedChange: 0, createdAt: '2026-11-12T00:00:00Z' });
  const rows = [
    entry(1, 'RESERVED'),
    entry(2, 'TRANSFER_OUT'),
    entry(3, 'RESERVATION_UPDATED'),
    entry(4, 'TRANSFER_IN'),
    entry(5, 'RELEASED'),
    entry(6, 'INITIAL_GRANT'),
    entry(7, 'TRANSFER_OUT'),
  ];
  global.fetch = async (url) => {
    const token = new URL(url, 'http://localhost').searchParams.get('pageToken');
    const start = token ? rows.findIndex(row => row.id === Buffer.from(token, 'base64url').toString()) + 1 : 0;
    const page = rows.slice(start, start + 50);
    return { ok: true, status: 200, json: async () => ({ entries: page, nextPageToken: null }) };
  };
  const first = await loadVisibleCreditHistory(2);
  assert.deepEqual(first.entries.map(row => row.type), ['TRANSFER_OUT', 'TRANSFER_IN']);
  assert.equal(Buffer.from(first.nextPageToken, 'base64url').toString(), id(4));
  const second = await loadVisibleCreditHistory(2, first.nextPageToken);
  assert.deepEqual(second.entries.map(row => row.type), ['INITIAL_GRANT', 'TRANSFER_OUT']);
  assert.equal(second.nextPageToken, null);
});
