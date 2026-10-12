const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { randomUUID } = require('node:crypto');
const { Metadata, status } = require('@grpc/grpc-js');
const rpc = require('@foc/grpc');
const { createPool, CreditDatabase } = require('../dist/database/database');
const { migrate } = require('../dist/database/migrate');
const { CreditService } = require('../dist/services/credit-service');
const { createGrpcServer } = require('../dist/grpc/server');

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

test('initialisation creates ten credits once and records its grant', async () => {
  const userId = await user();
  await service.initCredits({ userId });
  assert.deepEqual(await service.displayCredit({ userId }), { userId, totalCredits: 10, reservedCredits: 0, availableCredits: 10 });
  assert.equal((await rows('history', userId)).length, 1);
});

test('reserve, update and release change availability while retaining the total balance', async () => {
  const requesterId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 4 });
  assert.equal((await service.displayCredit({ userId: requesterId })).availableCredits, 6);
  await service.updateReservation({ orderId, amount: 6 });
  assert.equal((await service.displayCredit({ userId: requesterId })).availableCredits, 4);
  await service.releaseReservation({ orderId });
  const account = await service.displayCredit({ userId: requesterId });
  assert.equal(account.totalCredits, 10); assert.equal(account.reservedCredits, 0);
  const history = await service.displayUserHistory({ userId: requesterId });
  assert.deepEqual(history.entries.map(e => [e.type, e.reservedDelta]),
    [['RELEASED', -6], ['RESERVATION_UPDATED', 2], ['RESERVED', 4], ['INITIAL_GRANT', 0]]);
});

test('settlement moves held credits from the requester to the courier atomically', async () => {
  const requesterId = await user(); const courierId = await user(); const orderId = id();
  await service.createReservation({ orderId, requesterId, amount: 3 });
  const reservation = await service.transferReservation({ orderId, courierId });
  assert.equal(reservation.status, 'SETTLED');
  assert.equal((await service.displayCredit({ userId: requesterId })).totalCredits, 7);
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 0);
  assert.equal((await service.displayCredit({ userId: courierId })).totalCredits, 13);
});

test('invalid amounts, missing accounts and insufficient credits leave balances unchanged', async () => {
  const requesterId = await user(); const orderId = id();
  await assert.rejects(service.createReservation({ orderId, requesterId, amount: 0 }), rejected('INVALID_ARGUMENT'));
  await assert.rejects(service.createReservation({ orderId, requesterId: id(), amount: 1 }), rejected('NOT_FOUND'));
  await assert.rejects(service.createReservation({ orderId, requesterId, amount: 11 }), rejected('FAILED_PRECONDITION'));
  assert.equal((await service.displayCredit({ userId: requesterId })).availableCredits, 10);
});

test('a history write failure rolls back the account and reservation', async () => {
  const requesterId = await user(); const orderId = id();
  const failing = new CreditService({ transaction: action => database.transaction(async repositories => {
    repositories.credit.saveCreditHistoryEntry = async () => { throw new Error('Injected history failure'); };
    return action(repositories);
  }) });
  await assert.rejects(failing.createReservation({ orderId, requesterId, amount: 4 }), /Injected history failure/);
  assert.equal((await service.displayCredit({ userId: requesterId })).reservedCredits, 0);
  assert.equal((await pool.query('SELECT * FROM credit.reservations WHERE order_id = $1', [orderId])).rowCount, 0);
});

test('real gRPC endpoints enforce the transport guard and return business errors', async t => {
  const token = 'test-service-token-'.repeat(4);
  const server = createGrpcServer(service, token);
  const port = await rpc.startServer(server, 0, '127.0.0.1');
  const client = rpc.createCreditClient(`127.0.0.1:${port}`);
  t.after(async () => { client.close(); await rpc.stopServer(server, 100); });
  const metadata = new Metadata(); metadata.set('x-credit-service-token', token);
  const options = { metadata }; const userId = id(); const courierId = id(); const orderId = id();
  await assert.rejects(client.initCredits({ userId }), rejected(status.UNAUTHENTICATED));
  assert.equal((await client.initCredits({ userId }, options)).totalCredits, 10);
  await client.initCredits({ userId: courierId }, options);
  await assert.rejects(client.reserveCredits({ orderId, requesterId: userId, amount: 11 }, options), rejected(status.FAILED_PRECONDITION));
  const reservation = await client.reserveCredits({ orderId, requesterId: userId, amount: 4 }, options);
  await client.updateReservation({ orderId, amount: 3 }, options);
  assert.equal((await client.settleCredits({ orderId, courierId }, options)).status, 'SETTLED');
  assert.equal((await client.getBalance({ userId }, options)).availableCredits, 7);
  assert.equal((await client.getCreditHistory({ userId }, options)).entries.length, 4);
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
    CREDIT_SERVICE_TOKEN: 'test-service-token-'.repeat(4) };
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
    [path.resolve(__dirname, '../../examples/core-flow.mjs')], { env: environment, timeout: 10000 });
  assert.match(stdout, /totalCredits: 7/);
  assert.match(stdout, /totalCredits: 13/);
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  assert.equal(await exited, 0);
});
