import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { before, after, test } from 'node:test';
import { Metadata } from '@grpc/grpc-js';
import { createCreditClient, startServer, stopServer } from '@foc/grpc';
import { PrismaClient } from '../src/generated/prisma';
import { createOrderCommands, type CommandResult } from '../src/api/services/orderCommands';
import { configuredCreditGateway } from '../src/dependencies/configuredCreditGateway';
import { fakeDependencies } from './fakeDependencies';
import { identity } from './helpers';

// Real Credit service/ledger and Order persistence, in separate dedicated DBs.
// User/Supplier snapshots are test doubles; this is not a full system E2E test.
const orderUrl = process.env.TEST_DATABASE_URL;
const creditUrl = process.env.CREDIT_TEST_DATABASE_URL;
if (!orderUrl || !/^\/order_service_test(?:_[a-z0-9]+)?$/.test(new URL(orderUrl).pathname))
  throw new Error('Dedicated TEST_DATABASE_URL required');
if (!creditUrl || new URL(creditUrl).pathname !== '/credit_test')
  throw new Error('Dedicated CREDIT_TEST_DATABASE_URL named credit_test required');
const { createPool, CreditDatabase } = require('../../credit-service/dist/database/database');
const { migrate } = require('../../credit-service/dist/database/migrate');
const { CreditService } = require('../../credit-service/dist/services/credit-service');
const { createGrpcServer } = require('../../credit-service/dist/grpc/server');
const pool = createPool(creditUrl);
const server = createGrpcServer(new CreditService(new CreditDatabase(pool)), {
  serviceTokens: { 'order-service': 'o'.repeat(64), 'user-service': 'u'.repeat(64) }, audit() {},
});
const db = new PrismaClient({ datasources: { db: { url: orderUrl } } });
const requester = identity(randomUUID()), courier = identity(randomUUID());
let connection: ReturnType<typeof configuredCreditGateway>;
let client: ReturnType<typeof createCreditClient>;
let commands: ReturnType<typeof createOrderCommands>;
const metadata = (token: string) => {
  const value = new Metadata(); value.set('x-credit-service-token', token); return { metadata: value };
};
const orderOptions = metadata('o'.repeat(64));
const ids: string[] = [];
const published = (result: CommandResult) => { assert.ok(result.ok, JSON.stringify(result)); return result.order; };
async function create() {
  const result = published(await commands.createOrder(requester, {
    supplierId: '1', destination: 'PGP', requestDetails: 'Real credit compatibility test',
    credits: 2, expiryTime: new Date(Date.now() + 86400000).toISOString(),
  }, randomUUID()));
  ids.push(result.id); return result;
}
before(async () => {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: orderUrl }, stdio: 'pipe',
  });
  await migrate(pool);
  const port = await startServer(server, 0, '127.0.0.1');
  client = createCreditClient(`127.0.0.1:${port}`);
  connection = configuredCreditGateway({ CREDIT_GRPC_ADDR: `127.0.0.1:${port}`,
    CREDIT_ORDER_SERVICE_TOKEN: 'o'.repeat(64), CREDIT_RPC_TIMEOUT_MS: 3000 });
  commands = createOrderCommands(db, { ...fakeDependencies().dependencies, credits: connection!.gateway });
  for (const userId of [requester.id, courier.id])
    await client.initCredits({ userId }, metadata('u'.repeat(64)));
});
after(async () => {
  connection?.close(); client?.close(); await stopServer(server, 100);
  try {
    await db.creditOperation.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.orderCreation.deleteMany({ where: { requesterId: requester.id } });
  } finally { await db.$disconnect(); await pool.end(); }
});
test('real credit contract reserves, publishes, settles once and preserves total balances', async () => {
  const order = await create();
  const receipt = await client.getReservation({ orderId: order.id }, orderOptions);
  assert.equal(receipt.status, 'RESERVED'); assert.equal(receipt.version, 1); assert.ok(receipt.reservationId);
  assert.equal((await client.getBalance({ userId: requester.id }, orderOptions)).availableCredits, 8);
  await commands.transition(courier, order.id, 'accept');
  await commands.transition(courier, order.id, 'pickup');
  assert.equal(published(await commands.transition(courier, order.id, 'deliver')).creditState, 'SETTLED');
  await commands.transition(courier, order.id, 'deliver');
  assert.equal((await client.getBalance({ userId: requester.id }, orderOptions)).totalCredits, 8);
  assert.equal((await client.getBalance({ userId: courier.id }, orderOptions)).totalCredits, 12);
});
test('real cancellation releases the hold without granting extra total credits', async () => {
  const order = await create();
  const balance = await client.getBalance({ userId: requester.id }, orderOptions);
  assert.equal(published(await commands.transition(requester, order.id, 'cancel')).creditState, 'REFUNDED');
  await commands.transition(requester, order.id, 'cancel');
  const after = await client.getBalance({ userId: requester.id }, orderOptions);
  assert.equal(after.totalCredits, balance.totalCredits); assert.equal(after.reservedCredits, 0);
  assert.equal((await client.getReservation({ orderId: order.id }, orderOptions)).status, 'RELEASED');
});
test('real picked-up expiry refunds and historical reserve replay differs from current lookup', async () => {
  const order = await create();
  await commands.transition(courier, order.id, 'accept');
  await commands.transition(courier, order.id, 'pickup');
  await db.order.update({ where: { id: order.id }, data: {
    createdAt: new Date(Date.now() - 86400000), expiryTime: new Date(Date.now() - 1000),
  } });
  await commands.expireOrders();
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).creditState, 'REFUNDED');
  assert.equal((await client.reserveCredits({ orderId: order.id, requesterId: requester.id, amount: 2 }, orderOptions)).status, 'RESERVED');
  assert.equal((await client.getReservation({ orderId: order.id }, orderOptions)).status, 'RELEASED');
  assert.equal((await client.getBalance({ userId: requester.id }, orderOptions)).reservedCredits, 0);
});
