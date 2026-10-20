// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
// Scope: Tested human-specified own-data REST authentication/serialization, errors, and strict paging bookmarks.
// Refactor: Moved/imports updated for the human-specified src layout (entry 024).
// Author review: [HUMAN-REVIEWED]
// Prompts and key responses: ../ai/usage-log.md, entries 005–025 (prior scopes retained).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { generateKeyPairSync } = require('node:crypto');
const jwt = require('jsonwebtoken');
require('tsx/cjs');
const { ValidationError } = require('../src/services/validation.ts');
const { createRestServer } = require('../src/rest/server.ts');
const { CreditService, CreditOperationError } = require('../src/services/CreditService.ts');
const { encodeHistoryBookmark, decodeHistoryBookmark } = require('../src/services/historyBookmark.ts');

test('bookmarks accept only the exact user-scoped positive signed-bigint object', () => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const userId = 'student';
  assert.equal(decodeHistoryBookmark(encodeHistoryBookmark(userId, '9007199254740993'), userId), '9007199254740993');
  assert.equal(decodeHistoryBookmark(encode({ sequenceId: '9223372036854775807', userId }), userId), '9223372036854775807');
  for (const value of [
    null, [], [userId, '1'], {}, { userId }, { sequenceId: '1' },
    { userId: 'other', sequenceId: '1' }, { userId, sequenceId: '1', extra: true },
    ...['', '0', '01', '-1', '+1', ' 1', '1.5', '1e2', '9223372036854775808', '١', 1, null].map((sequenceId) => ({ userId, sequenceId })),
  ]) assert.throws(() => decodeHistoryBookmark(encode(value), userId), ValidationError);
  const valid = encode({ userId, sequenceId: '1' });
  for (const token of [undefined, '', '!', valid + '=', 'a', Buffer.from([0xff]).toString('base64url'), Buffer.from('{').toString('base64url')]) {
    assert.throws(() => decodeHistoryBookmark(token, userId), ValidationError);
  }
});

test('invalid history input fails before obtaining a database connection', async () => {
  const service = new CreditService({ connect() { throw new Error('Unexpected connection'); } });
  for (const pageSize of [0, -1, 1.5, 101, NaN, Infinity, null, '50']) {
    await assert.rejects(service.getUserCreditHistory({ userId: 'student', pageSize }), ValidationError);
  }
  await assert.rejects(service.getUserCreditHistory({ userId: 'student', pageToken: '' }), ValidationError);
  await assert.rejects(service.getUserCreditHistory({ userId: 'student', pageToken: encodeHistoryBookmark('other', '1') }), ValidationError);
  await assert.rejects(service.getUserCreditHistory({ userId: ' bad' }), ValidationError);
});

test('matched REST routes authenticate before business logic and derive user scope from the RS256 subject, including admins', async (t) => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const calls = [];
  const service = {
    async getBalance(input) { calls.push(input); return { totalCredits: 10, reservedCredits: 2, availableCredits: 8 }; },
    async getUserCreditHistory(input) {
      calls.push(input);
      return { entries: [{ id: 'history-id', userId: input.userId, sequenceId: '9007199254740993', orderId: null, reservationId: null,
        type: 'INITIAL_GRANT', totalAmountChange: 10, totalReservedChange: 0, createdAt: new Date('2026-10-20T00:00:00.000Z') }], nextPageToken: null };
    },
  };
  const server = createRestServer(service, publicKey.export({ type: 'spki', format: 'pem' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const authorization of [undefined, 'Bearer invalid', 'Bearer ' + jwt.sign({ sub: 'student', exp: 1 }, privateKey, { algorithm: 'RS256' })]) {
    const response = await fetch(origin + '/credits/me/balance', { headers: authorization ? { authorization } : {} });
    assert.equal(response.status, 401);
    assert.deepEqual(Object.keys(await response.json()).sort(), ['error', 'message']);
  }
  assert.equal(calls.length, 0);
  const token = jwt.sign({ sub: 'student', role: 'admin', userId: 'other' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
  const headers = { authorization: 'Bearer ' + token };
  const balance = await fetch(origin + '/credits/me/balance?userId=other', { headers });
  assert.equal(balance.status, 200);
  assert.deepEqual(await balance.json(), { userId: 'student', totalCredits: 10, reservedCredits: 2, availableCredits: 8 });
  const page = await fetch(origin + '/credits/me/history?pageSize=2&pageToken=bookmark&userId=other', { headers });
  assert.equal(page.status, 200);
  const data = await page.json();
  assert.equal(data.nextPageToken, null);
  assert.equal(data.entries[0].userId, 'student');
  assert.equal(data.entries[0].sequenceId, '9007199254740993');
  assert.equal(data.entries[0].createdAt, '2026-10-20T00:00:00.000Z');
  assert.equal(data.entries[0].orderId, null);
  assert.deepEqual(calls, [{ userId: 'student' }, { userId: 'student', pageSize: 2, pageToken: 'bookmark' }]);
  for (const query of ['pageSize=bad', 'pageSize=', 'pageSize=1&pageSize=2', 'pageToken=a&pageToken=b']) {
    const response = await fetch(origin + '/credits/me/history?' + query, { headers });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'Bad Request');
  }
  for (const path of ['/credits/other/balance', '/credits/orders/history']) {
    assert.equal((await fetch(origin + path, { headers })).status, 404);
  }
  assert.equal((await fetch(origin + '/credits/me/balance', { method: 'POST', headers })).status, 404);
  assert.equal(calls.length, 2);
});

test('REST reports account/database failures and logs unexpected service errors, including TypeError, without exposing them', async (t) => {
  const logged = [];
  t.mock.method(console, 'error', (...args) => logged.push(args));
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let failure;
  const server = createRestServer({ async getBalance() { throw failure; } }, publicKey.export({ type: 'spki', format: 'pem' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const headers = { authorization: 'Bearer ' + jwt.sign({ sub: 'student' }, privateKey, { algorithm: 'RS256', expiresIn: 60 }) };
  const url = 'http://127.0.0.1:' + server.address().port + '/credits/me/balance';
  for (const [error, code] of [
    [new CreditOperationError('NOT_FOUND', 'Account missing', 'ACCOUNT_NOT_FOUND'), 404],
    [{ code: 'ECONNRESET' }, 503], [new Error('private database details'), 500],
    [new TypeError('private service bug in balance calculation'), 500],
    [new ValidationError('Invalid user input'), 400],
  ]) {
    failure = error;
    const response = await fetch(url, { headers });
    assert.equal(response.status, code);
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['error', 'message']);
    assert.ok(!body.message.includes('private'));
    if (code === 500) {
      assert.equal(body.message, 'Internal credit-service error');
      assert.equal(logged.at(-1)[1], error);
    }
  }
  assert.equal(logged.length, 2);
});

test('unknown REST paths return 404 without authentication; both known GET routes require a token', async (t) => {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let calls = 0;
  const service = {
    async getBalance() { calls += 1; throw new Error('Must not reach service'); },
    async getUserCreditHistory() { calls += 1; throw new Error('Must not reach service'); },
  };
  const server = createRestServer(service, publicKey.export({ type: 'spki', format: 'pem' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
    const response = await fetch(origin + '/unknown-path', { headers });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not Found', message: 'Endpoint not found.' });
  }
  for (const path of ['/credits/me/balance', '/credits/me/history']) {
    assert.equal((await fetch(origin + path)).status, 401);
  }
  assert.equal(calls, 0);
});

test('known limitation: unsupported REST methods return 404 rather than 405, even without a token', async (t) => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const service = { async getBalance() { assert.fail('Wrong method must not call business logic'); } };
  const server = createRestServer(service, publicKey.export({ type: 'spki', format: 'pem' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const token = jwt.sign({ sub: 'student' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
  for (const path of ['/credits/me/balance', '/credits/me/history']) {
    for (const headers of [{}, { authorization: 'Bearer ' + token }]) {
      assert.equal((await fetch(origin + path, { method: 'POST', headers })).status, 404);
    }
  }
});
