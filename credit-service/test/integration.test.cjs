const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { randomUUID } = require('node:crypto');
const { Metadata, status } = require('@grpc/grpc-js');
const rpc = require('@foc/grpc');
const { createPool, CreditDatabase } = require('../dist/database/database');
const { migrate } = require('../dist/database/migrate');
const { CreditService } = require('../dist/services/credit-service');
const { createGrpcServer } = require('../dist/grpc/server');
const { CreditAccount, CreditHistoryEntry, HistoryType, IdempotencyRecord, Reservation, ReservationStatus } = require('../dist/domain/models');

const url = process.env.CREDIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/credit_test') {
  throw new Error('Set CREDIT_TEST_DATABASE_URL to a dedicated database named credit_test');
}
const pool = createPool(url);
const database = new CreditDatabase(pool);
const service = new CreditService(database);
const id = () => randomUUID();
const rejected = code => error => error.code === code;
async function user() { const userId = id(); await service.initCredits({ userId }); return userId; }
async function rows(table, userId) {
  return (await pool.query(`SELECT * FROM credit.${table} WHERE user_id = $1`, [userId])).rows;
}
before(async () => { await migrate(pool); await migrate(pool); });
after(async () => { await pool.end(); });

test('concurrent initialization uses the user ID as its retry key and grants exactly ten credits once', async () => {
  const userId = id();
  // Old JavaScript callers can still include the retired field; it cannot override the server's key.
  const results = await Promise.all(Array.from({ length: 20 }, (_, n) => service.initCredits(
    n % 2 ? { userId, idempotencyKey: id() } : { userId },
  )));
  const snapshot = { userId, totalCredits: 10, reservedCredits: 0, availableCredits: 10 };
  for (const result of results) assert.deepEqual(result, snapshot);
  assert.deepEqual(await service.displayCredit({ userId }), snapshot);
  assert.equal((await rows('history', userId)).length, 1);
  const retries = await rows('idempotency_records', userId);
  assert.equal(retries.length, 1);
  assert.equal(retries[0].operation, 'INIT');
  assert.equal(retries[0].key, userId);
  await service.createReservation({ orderId: id(), requesterId: userId, amount: 4 });
  assert.deepEqual(await service.initCredits({ userId }), snapshot);
  assert.equal((await service.displayCredit({ userId })).availableCredits, 6);
  assert.equal((await rows('history', userId)).length, 2);
});

test('reservations, amount updates and release record deltas without spending total balance', async () => {
  const userId = await user(); const orderId = id();
  const reservation = await service.createReservation({ orderId, requesterId: userId, amount: 4 });
  assert.equal(reservation.status, 'RESERVED');
  const request = { orderId, amount: 6, expectedVersion: reservation.version };
  const updated = await service.updateReservation(request);
  assert.equal(updated.version, 2);
  assert.deepEqual(await service.updateReservation(request), updated);
  await assert.rejects(service.updateReservation({ ...request, amount: 5 }), rejected('FAILED_PRECONDITION'));
  assert.equal((await service.displayCredit({ userId })).availableCredits, 4);
  await service.releaseReservation({ orderId });
  await service.releaseReservation({ orderId });
  assert.deepEqual(await service.displayCredit({ userId }), { userId, totalCredits: 10, reservedCredits: 0, availableCredits: 10 });
  const history = await service.displayUserHistory({ userId });
  assert.deepEqual(history.entries.map(e => [e.type, e.totalDelta, e.reservedDelta]),
    [['RELEASED', 0, -6], ['RESERVATION_UPDATED', 0, 2], ['RESERVED', 0, 4], ['INITIAL_GRANT', 10, 0]]);
  await assert.rejects(service.updateReservation({ ...request, expectedVersion: 3 }), rejected('FAILED_PRECONDITION'));
});

test('concurrent reservations cannot overspend', async () => {
  const userId = await user();
  const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => service.createReservation({ orderId: id(), requesterId: userId, amount: 2 })));
  assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 5);
  for (const attempt of attempts.filter(a => a.status === 'rejected')) assert.equal(attempt.reason.code, 'FAILED_PRECONDITION');
  assert.equal((await service.displayCredit({ userId })).reservedCredits, 10);
  assert.equal((await rows('history', userId)).length, 6);
});

test('concurrent amount updates accept only one request for the same version', async () => {
  const requesterId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 4 });
  const attempts = await Promise.allSettled([5, 6].map(amount => service.updateReservation({
    orderId, amount, expectedVersion: 1,
  })));
  assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(a => a.status === 'rejected').reason.code, 'FAILED_PRECONDITION');
  const winner = attempts.find(a => a.status === 'fulfilled').value;
  assert.equal(winner.version, 2);
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, winner.amount);
});

test('update retries use order and expected version, replay after later changes, and reject conflicting amounts', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  const reservation = await service.createReservation({ orderId, requesterId, amount: 4 });
  const firstEdit = { orderId, amount: 5, expectedVersion: reservation.version };
  // A failed attempt does not consume this version or persist a successful result.
  await assert.rejects(service.updateReservation({ ...firstEdit, amount: 11 }), rejected('FAILED_PRECONDITION'));
  const results = await Promise.all(Array.from({ length: 20 }, () => service.updateReservation(firstEdit)));
  const first = results[0];
  for (const result of results) assert.deepEqual(result, first);
  assert.equal(first.version, 2);
  assert.equal((await rows('history', requesterId)).length, 3);
  const secondEdit = { orderId, amount: 3, expectedVersion: first.version };
  const second = await service.updateReservation(secondEdit);
  assert.equal(second.version, 3);
  assert.deepEqual(await service.updateReservation(firstEdit), first);
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 3);
  await assert.rejects(service.updateReservation({ ...firstEdit, amount: 6 }), rejected('FAILED_PRECONDITION'));
  const retries = (await rows('idempotency_records', requesterId)).filter(row => row.operation === 'UPDATE');
  assert.equal(retries.length, 2);
  assert.deepEqual(retries.map(row => JSON.parse(row.key)).sort((a, b) => a[1] - b[1]), [[orderId, 1], [orderId, 2]]);
  await service.transferReservation({ orderId, courierId });
  assert.deepEqual(await service.updateReservation(firstEdit), first);
  assert.deepEqual(await service.updateReservation(secondEdit), second);
  assert.equal((await service.displayCredit({ userId: requesterId })).totalCredits, 7);
  assert.equal((await service.displayCredit({ userId: courierId })).totalCredits, 13);
  assert.equal((await rows('history', requesterId)).length, 5);
  await assert.rejects(service.updateReservation({ orderId, amount: 2, expectedVersion: 4 }), rejected('FAILED_PRECONDITION'));
  // The same version on another order identifies a separate edit.
  const otherOrder = id();
  await service.createReservation({ orderId: otherOrder, requesterId, amount: 1 });
  assert.equal((await service.updateReservation({ orderId: otherOrder, amount: 2, expectedVersion: 1 })).version, 2);
});

test('reservation retries use the order ID and reject changed requester or amount', async () => {
  const userId = await user(); const orderId = id();
  const request = { orderId, requesterId: userId, amount: 4 };
  const results = await Promise.all(Array.from({ length: 15 }, () => service.createReservation(request)));
  assert.equal(new Set(results.map(r => r.reservationId)).size, 1);
  assert.equal((await service.displayCredit({ userId })).reservedCredits, 4);
  await assert.rejects(service.createReservation({ ...request, amount: 5 }), rejected('FAILED_PRECONDITION'));
  await assert.rejects(service.createReservation({ ...request, requesterId: await user() }), rejected('FAILED_PRECONDITION'));
  await service.releaseReservation({ orderId });
  // Lost-response retries replay the original response; fresh reads give current state.
  assert.deepEqual(await service.createReservation(request), results[0]);
  assert.equal((await pool.query('SELECT status FROM credit.reservations WHERE order_id = $1', [orderId])).rows[0].status, 'RELEASED');
  const retries = (await rows('idempotency_records', userId)).filter(row => row.operation === 'RESERVE');
  assert.equal(retries.length, 1);
  assert.equal(retries[0].key, orderId);
  assert.equal((await service.displayCredit({ userId })).reservedCredits, 0);
  assert.equal((await rows('history', userId)).length, 3);
});

test('settlement transfers once, conserves total credits and prevents invalid transitions', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 4 });
  const results = await Promise.all(Array.from({ length: 15 }, () => service.transferReservation({ orderId, courierId })));
  for (const result of results) assert.deepEqual(result, results[0]);
  const sender = await service.displayCredit({ userId: requesterId }); const recipient = await service.displayCredit({ userId: courierId });
  assert.equal(sender.totalCredits, 6); assert.equal(sender.reservedCredits, 0);
  assert.equal(recipient.totalCredits, 14); assert.equal(sender.totalCredits + recipient.totalCredits, 20);
  assert.equal((await rows('history', requesterId)).length, 3);
  assert.equal((await rows('history', courierId)).length, 2);
  await assert.rejects(service.releaseReservation({ orderId }), rejected('FAILED_PRECONDITION'));
  await assert.rejects(service.transferReservation({ orderId, courierId: requesterId }), rejected('FAILED_PRECONDITION'));
});

test('opposing transfers lock accounts consistently', async () => {
  const a = await user(); const b = await user(); const first = id(); const second = id();
  await service.createReservation({ orderId: first, requesterId: a, amount: 3 });
  await service.createReservation({ orderId: second, requesterId: b, amount: 5 });
  await Promise.all([service.transferReservation({ orderId: first, courierId: b }), service.transferReservation({ orderId: second, courierId: a })]);
  assert.equal((await service.displayCredit({ userId: a })).totalCredits, 12);
  assert.equal((await service.displayCredit({ userId: b })).totalCredits, 8);
});

test('release racing settlement produces exactly one terminal transition', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 4 });
  const attempts = await Promise.allSettled([service.releaseReservation({ orderId }), service.transferReservation({ orderId, courierId })]);
  assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(a => a.status === 'rejected').reason.code, 'FAILED_PRECONDITION');
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 0);
  const total = (await service.displayCredit({ userId: requesterId })).totalCredits + (await service.displayCredit({ userId: courierId })).totalCredits;
  assert.equal(total, 20);
});

test('missing accounts, insufficient balance and self-transfer leave reservations intact', async () => {
  await assert.rejects(service.displayCredit({ userId: id() }), rejected('NOT_FOUND'));
  await assert.rejects(service.createReservation({ orderId: id(), requesterId: id(), amount: 1 }), rejected('NOT_FOUND'));
  const requesterId = await user(); const orderId = id();
  await assert.rejects(service.createReservation({ orderId, requesterId, amount: 11 }), rejected('FAILED_PRECONDITION'));
  await service.createReservation({ orderId, requesterId, amount: 4 });
  await assert.rejects(service.transferReservation({ orderId, courierId: id() }), rejected('NOT_FOUND'));
  await assert.rejects(service.transferReservation({ orderId, courierId: requesterId }), rejected('FAILED_PRECONDITION'));
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 4);
  await service.releaseReservation({ orderId });
  await assert.rejects(service.transferReservation({ orderId, courierId: await user() }), rejected('FAILED_PRECONDITION'));
});

test('history write failure rolls back account, reservation and retry record together', async () => {
  const userId = await user(); const orderId = id();
  const failing = new CreditService({ transaction: action => database.transaction(async repositories => {
    repositories.credit.saveCreditHistoryEntry = async () => { throw new Error('Injected history failure'); };
    return action(repositories);
  }) });
  await assert.rejects(failing.createReservation({ orderId, requesterId: userId, amount: 4 }), /Injected history failure/);
  assert.equal((await service.displayCredit({ userId })).reservedCredits, 0);
  assert.equal((await pool.query('SELECT * FROM credit.reservations WHERE order_id = $1', [orderId])).rowCount, 0);
  assert.equal((await pool.query("SELECT * FROM credit.idempotency_records WHERE operation = 'RESERVE' AND key = $1", [orderId])).rowCount, 0);
  assert.equal((await rows('history', userId)).length, 1);
  await service.createReservation({ orderId, requesterId: userId, amount: 4 });
});

test('second transfer history failure rolls back both accounts and permits a safe retry', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 4 });
  const failing = new CreditService({ transaction: action => database.transaction(async repositories => {
    const save = repositories.credit.saveCreditHistoryEntry.bind(repositories.credit);
    let writes = 0;
    repositories.credit.saveCreditHistoryEntry = entry => ++writes === 2
      ? Promise.reject(new Error('Injected recipient history failure')) : save(entry);
    return action(repositories);
  }) });
  const request = { orderId, courierId };
  await assert.rejects(failing.transferReservation(request), /Injected recipient history failure/);
  assert.deepEqual(await service.displayCredit({ userId: requesterId }),
    { userId: requesterId, totalCredits: 10, reservedCredits: 4, availableCredits: 6 });
  assert.equal((await service.displayCredit({ userId: courierId })).totalCredits, 10);
  assert.equal((await rows('history', requesterId)).length, 2);
  assert.equal((await rows('history', courierId)).length, 1);
  assert.equal((await pool.query('SELECT status FROM credit.reservations WHERE order_id = $1', [orderId])).rows[0].status, 'RESERVED');
  assert.equal((await pool.query("SELECT * FROM credit.idempotency_records WHERE operation = 'SETTLE' AND key = $1", [orderId])).rowCount, 0);
  await service.transferReservation(request);
  assert.equal((await service.displayCredit({ userId: courierId })).totalCredits, 14);
});

test('recipient integer overflow is rejected before credit is moved', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  // Dedicated test fixture at the upper storage boundary.
  await pool.query('UPDATE credit.accounts SET total_credits = 2147483647 WHERE user_id = $1', [courierId]);
  await service.createReservation({ orderId, requesterId, amount: 1 });
  await assert.rejects(service.transferReservation({ orderId, courierId }), rejected('FAILED_PRECONDITION'));
  assert.equal((await service.displayCredit({ userId: requesterId })).totalCredits, 10);
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 1);
  assert.equal((await service.displayCredit({ userId: courierId })).totalCredits, 2147483647);
});

test('history pagination is bounded to its user and ledger rows cannot be changed', async () => {
  const userId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId: userId, amount: 1 });
  await service.releaseReservation({ orderId });
  const first = await service.displayUserHistory({ userId, pageSize: 2 });
  const second = await service.displayUserHistory({ userId, pageSize: 2, pageToken: first.nextPageToken });
  assert.equal(first.entries.length, 2); assert.equal(second.entries.length, 1); assert.equal(second.nextPageToken, '');
  assert.equal(new Set([...first.entries, ...second.entries].map(e => e.id)).size, 3);
  await assert.rejects(service.displayUserHistory({ userId: await user(), pageToken: first.nextPageToken }), rejected('INVALID_ARGUMENT'));
  await assert.rejects(pool.query('UPDATE credit.history SET total_delta = 0 WHERE user_id = $1', [userId]), /append-only/);
  await assert.rejects(pool.query('DELETE FROM credit.history WHERE user_id = $1', [userId]), /append-only/);
});

test('SQL repository restores diagram entities while responses preserve the existing contract', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 3 });
  const snapshot = await service.transferReservation({ orderId, courierId });
  const history = await service.displayUserHistory({ userId: requesterId });
  await database.transaction(async ({ credit }) => {
    const account = await credit.findByUserId(requesterId);
    assert.ok(account instanceof CreditAccount);
    assert.equal(account.getAvailableBalance(), 7);
    assert.throws(() => account.initAccount(), rejected('FAILED_PRECONDITION'));
    const reservation = await credit.findReservation(orderId);
    assert.ok(reservation instanceof Reservation);
    assert.equal(reservation.userID, requesterId);
    assert.equal(reservation.errandID, orderId);
    assert.equal(reservation.reservationStatus, ReservationStatus.TRANSFERRED);
    const entry = await credit.findCreditHistoryEntry(history.entries[0].id);
    assert.ok(entry instanceof CreditHistoryEntry);
    assert.equal(entry.type, HistoryType.TRANSFER);
    assert.equal(entry.amount, -3);
    assert.equal(entry.reservedDelta, -3);
    assert.ok(entry.timestamp instanceof Date);
    const retry = await credit.findIdempotencyRecord('SETTLE', orderId);
    assert.ok(retry instanceof IdempotencyRecord);
    assert.equal(retry.userID, requesterId);
    assert.ok(retry.timestamp instanceof Date);
    assert.deepEqual(retry.result, snapshot);
  });
  assert.equal(snapshot.status, 'SETTLED');
  assert.equal(history.entries[0].type, 'TRANSFER_OUT');
});

test('idempotency migration backfills legacy successful snapshots and keeps their original responses', async () => {
  const { readFile } = require('node:fs/promises');
  const path = require('node:path');
  const { createHash } = require('node:crypto');
  const userId = await user(); const key = id();
  const snapshot = { userId, totalCredits: 10, reservedCredits: 0, availableCredits: 10 };
  const requestHash = createHash('sha256').update(JSON.stringify({ userId })).digest('hex');
  const client = await pool.connect();
  try {
    // Simulate the earlier schema inside a transaction, then restore it by rollback.
    await client.query('BEGIN');
    await client.query('ALTER TABLE credit.idempotency_records DROP COLUMN user_id');
    await client.query('INSERT INTO credit.idempotency_records(operation, key, request_hash, result) VALUES ($1, $2, $3, $4::jsonb)',
      ['INIT', key, requestHash, JSON.stringify(snapshot)]);
    await client.query(await readFile(path.resolve(__dirname, '../db/migrations/002_idempotency_user.sql'), 'utf8'));
    const record = (await client.query('SELECT user_id, result FROM credit.idempotency_records WHERE key = $1', [key])).rows[0];
    assert.equal(record.user_id, userId);
    assert.deepEqual(record.result, snapshot);
  } finally {
    await client.query('ROLLBACK'); client.release();
  }
  // The existing user-ID-keyed response stays replayable after later balance changes.
  await service.createReservation({ orderId: id(), requesterId: userId, amount: 4 });
  assert.deepEqual(await service.initCredits({ userId }), snapshot);
  assert.equal((await service.displayCredit({ userId })).availableCredits, 6);
  assert.equal((await rows('history', userId)).length, 2);
  // Accounts created with a legacy custom key must not receive another grant either.
  await pool.query("UPDATE credit.idempotency_records SET key = $1 WHERE operation = 'INIT' AND key = $2", [key, userId]);
  assert.deepEqual(await service.initCredits({ userId }),
    { userId, totalCredits: 10, reservedCredits: 4, availableCredits: 6 });
  assert.equal((await rows('history', userId)).length, 2);
});

test('real gRPC endpoints enforce caller scopes, user ownership, admin roles and business errors', async t => {
  const { generateKeyPairSync } = require('node:crypto');
  const jwt = require('jsonwebtoken');
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const tokens = { 'user-service': 'u'.repeat(64), 'order-service': 'o'.repeat(64),
    'frontend-service': 'f'.repeat(64), 'admin-service': 'a'.repeat(64) };
  const audit = [];
  const server = createGrpcServer(service, { serviceTokens: tokens, userPublicKey: keys.publicKey, audit: event => audit.push(event) });
  const port = await rpc.startServer(server, 0, '127.0.0.1');
  const client = rpc.createCreditClient(`127.0.0.1:${port}`);
  t.after(async () => { client.close(); await rpc.stopServer(server, 100); });
  const options = (caller, subject, roles = ['USER']) => {
    const metadata = new Metadata(); metadata.set('x-credit-service-token', tokens[caller]);
    if (subject) metadata.set('authorization', `Bearer ${jwt.sign({ roles }, keys.privateKey,
      { algorithm: 'RS256', subject, expiresIn: '15m' })}`);
    return { metadata };
  };
  const userOptions = options('user-service'); const orderOptions = options('order-service');
  const userId = id(); const courierId = id(); const orderId = id(); const ownRead = options('frontend-service', userId);
  await assert.rejects(client.initCredits({ userId }), rejected(status.UNAUTHENTICATED));
  await assert.rejects(client.initCredits({ userId }, orderOptions), rejected(status.PERMISSION_DENIED));
  assert.equal((await client.initCredits({ userId }, userOptions)).totalCredits, 10);
  await client.initCredits({ userId: courierId }, userOptions);
  await assert.rejects(client.reserveCredits({ orderId, requesterId: userId, amount: 4 }, ownRead), rejected(status.PERMISSION_DENIED));
  assert.equal((await service.displayCredit({ userId })).reservedCredits, 0);
  await assert.rejects(client.getBalance({ userId: courierId }, ownRead), rejected(status.PERMISSION_DENIED));
  await assert.rejects(client.getCreditHistory({ userId }, options('frontend-service')), rejected(status.UNAUTHENTICATED));
  await assert.rejects(client.getBalance({ userId }, options('admin-service', courierId)), rejected(status.PERMISSION_DENIED));
  assert.equal((await client.getBalance({ userId }, options('admin-service', courierId, ['USER', 'ADMINISTRATOR']))).totalCredits, 10);
  await assert.rejects(client.getBalance({ userId: id() }, orderOptions), rejected(status.NOT_FOUND));
  await assert.rejects(client.reserveCredits({ orderId, requesterId: userId, amount: 0 }, orderOptions), rejected(status.INVALID_ARGUMENT));
  await assert.rejects(client.reserveCredits({ orderId, requesterId: userId, amount: 11 }, orderOptions), rejected(status.FAILED_PRECONDITION));
  const reservation = await client.reserveCredits({ orderId, requesterId: userId, amount: 4 }, orderOptions);
  assert.ok(reservation.reservationId); assert.equal(reservation.version, 1);
  const edit = { orderId, amount: 3, expectedVersion: reservation.version };
  const updated = await client.updateReservation(edit, orderOptions);
  assert.equal((await client.settleCredits({ orderId, courierId }, orderOptions)).status, 'SETTLED');
  assert.deepEqual(await client.updateReservation(edit, orderOptions), updated);
  await assert.rejects(client.updateReservation({ ...edit, amount: 2 }, orderOptions), rejected(status.FAILED_PRECONDITION));
  assert.equal((await client.getBalance({ userId }, ownRead)).availableCredits, 7);
  assert.equal((await client.getCreditHistory({ userId }, ownRead)).entries.length, 4);
  const releaseOrder = id();
  await client.reserveCredits({ orderId: releaseOrder, requesterId: userId, amount: 1 }, orderOptions);
  assert.equal((await client.releaseCredits({ orderId: releaseOrder }, orderOptions)).status, 'RELEASED');
  assert.ok(audit.some(event => event.decision === 'allowed') && audit.some(event => event.decision === 'denied'));
});

test('compiled service entrypoint starts, runs the documented demo and shuts down cleanly', async t => {
  const { createServer } = require('node:net');
  const { spawn, execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const path = require('node:path');
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const environment = { ...process.env, DATABASE_URL: url, GRPC_HOST: '127.0.0.1', GRPC_PORT: String(port),
    CREDIT_GRPC_ADDR: `127.0.0.1:${port}`, NODE_ENV: 'test',
    CREDIT_USER_SERVICE_TOKEN: 'u'.repeat(64), CREDIT_ORDER_SERVICE_TOKEN: 'o'.repeat(64) };
  const child = spawn(process.execPath, [path.resolve(__dirname, '../dist/index.js')], { env: environment });
  let errors = ''; child.stderr.on('data', chunk => { errors += chunk; });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Startup timed out: ${errors}`)), 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Service exited with ${code}: ${errors}`)); });
    child.stdout.on('data', chunk => { if (chunk.toString().includes('credit-service gRPC listening')) { clearTimeout(timer); resolve(); } });
  });
  const { stdout } = await promisify(execFile)(process.execPath,
    [path.resolve(__dirname, '../examples/core-flow.mjs')], { env: environment, timeout: 10000 });
  assert.match(stdout, /totalCredits: 7/);
  assert.match(stdout, /totalCredits: 13/);
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  assert.equal(await exited, 0);
});

test('credit gRPC works over verified TLS and rejects plaintext connections', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const { credentials, ServerCredentials } = require('@grpc/grpc-js');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'credit-tls-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const keyFile = path.join(directory, 'key.pem'); const certFile = path.join(directory, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile,
    '-out', certFile, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'],
    { stdio: 'ignore', timeout: 10000 });
  const cert = await fs.readFile(certFile); const key = await fs.readFile(keyFile);
  const token = 't'.repeat(64);
  const server = createGrpcServer(service, { serviceTokens: { 'user-service': token }, audit() {} });
  const port = await rpc.startServer(server, 0, '127.0.0.1', ServerCredentials.createSsl(null, [{ cert_chain: cert, private_key: key }]));
  const secure = rpc.createCreditClient(`localhost:${port}`, { credentials: credentials.createSsl(cert) });
  const insecure = rpc.createCreditClient(`127.0.0.1:${port}`, { timeoutMs: 500 });
  t.after(async () => { secure.close(); insecure.close(); await rpc.stopServer(server, 100); });
  const metadata = new Metadata(); metadata.set('x-credit-service-token', token);
  assert.equal((await secure.initCredits({ userId: id() }, { metadata })).totalCredits, 10);
  await assert.rejects(insecure.initCredits({ userId: id() }, { metadata }),
    error => error.code === status.UNAVAILABLE || error.code === status.DEADLINE_EXCEEDED);
});
