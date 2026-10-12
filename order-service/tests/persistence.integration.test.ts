import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PrismaClient, type Prisma } from '../src/generated/prisma';
import { createOrderService } from '../src/api/services/orderService';
import { createApp } from '../src/api/app';
import { LocalJwtAuthProvider } from '../src/auth/localJwtAuthProvider';
import { pingDatabase } from '../src/db';
import { createKeys, identity, signToken } from './helpers';

// Never reuse DATABASE_URL: deploy only into an explicitly named test database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/^\/order_service_test(?:_[a-z0-9]+)?$/.test(new URL(testUrl).pathname)) {
  throw new Error('TEST_DATABASE_URL must target a dedicated order_service_test database.');
}
const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
const service = createOrderService(db);
const run = randomUUID();
const requester = `${run}-requester`;
const courier = `${run}-courier`;
const stranger = `${run}-stranger`;
const keys = createKeys();
const ids: string[] = [];
let server: Server;
let baseUrl: string;
let open: string;
let own: string;
let overdue: string;
let assigned: string;
let delivered: string;
let cancelled: string;

async function fixture(overrides: Partial<Prisma.OrderUncheckedCreateInput> = {}) {
  const id = randomUUID();
  ids.push(id);
  return db.$transaction(async (tx) => {
    await tx.orderCreation.create({ data: {
      orderId: id, requesterId: requester, idempotencyKey: id,
      requestFingerprint: 'fixture', payload: { fixture: true }, state: 'SUCCEEDED',
    } });
    return tx.order.create({ data: {
      id, requesterId: requester, supplierId: 9007199254740993n,
      pickupStore: 'Campus Cafe', pickupLocation: 'COM3', requesterName: 'Requester',
      destination: 'PGP', requestDetails: 'One iced latte', credits: 4,
      createdAt: new Date(Date.now() - 86_400_000), expiryTime: new Date(Date.now() + 86_400_000),
      ...overrides,
    } });
  });
}

before(async () => {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'pipe',
  });
  open = (await fixture()).id;
  own = (await fixture({ requesterId: stranger })).id;
  overdue = (await fixture({ expiryTime: new Date(Date.now() - 1000) })).id;
  assigned = (await fixture({ status: 'ASSIGNED', courierId: courier, courierName: 'Courier', acceptedAt: new Date() })).id;
  delivered = (await fixture({
    status: 'DELIVERED', courierId: courier, courierName: 'Courier', acceptedAt: new Date(),
    pickedUpAt: new Date(), deliveredAt: new Date(), creditState: 'SETTLED',
  })).id;
  cancelled = (await fixture({ status: 'CANCELLED', cancellationReason: 'REQUESTER', cancelledAt: new Date(), creditState: 'REFUNDED' })).id;
  const app = createApp({
    authProvider: new LocalJwtAuthProvider({ publicKey: keys.publicKey }),
    orders: service, pingDatabase: () => pingDatabase(db),
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  try {
    if (ids.length > 0) {
      await db.creditOperation.deleteMany({ where: { orderId: { in: ids } } });
      await db.order.deleteMany({ where: { id: { in: ids } } });
      await db.orderCreation.deleteMany({ where: { orderId: { in: ids } } });
    }
  } finally {
    await db.$disconnect();
  }
});

test('open reads exclude own, overdue and non-Unassigned orders using database time', async () => {
  const result = await service.listOrders(identity(stranger), 'open');
  assert.ok(result.ok);
  const found = result.value.map((order) => order.id);
  assert.ok(found.includes(open));
  for (const id of [own, overdue, assigned, delivered, cancelled]) assert.ok(!found.includes(id));
  const response = await fetch(baseUrl + '/orders?scope=open', {
    headers: { Authorization: `Bearer ${signToken(keys.privateKey, stranger)}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { orders: { id: string; supplierId: string; expiryTime: string }[] };
  const order = body.orders.find((item) => item.id === open)!;
  assert.equal(order.supplierId, '9007199254740993');
  assert.match(order.expiryTime, /Z$/);
});

test('requested/assigned lists are caller scoped and retain terminal history', async () => {
  const requests = await service.listOrders(identity(requester), 'requested');
  assert.ok(requests.ok);
  assert.ok(requests.value.some((order) => order.id === delivered));
  assert.ok(requests.value.some((order) => order.id === cancelled));
  assert.ok(requests.value.every((order) => order.requesterId === requester));
  const deliveries = await service.listOrders(identity(courier), 'assigned');
  assert.ok(deliveries.ok);
  assert.deepEqual(new Set(deliveries.value.map((order) => order.id)), new Set([assigned, delivered]));
});

test('admin-all requires administrator even when bypassing HTTP middleware', async () => {
  assert.deepEqual(await service.listOrders(identity(stranger), 'all'), { ok: false, reason: 'forbidden' });
  const result = await service.listOrders(identity('admin', ['ADMINISTRATOR']), 'all');
  assert.ok(result.ok);
  for (const id of [open, own, overdue, assigned, delivered, cancelled]) assert.ok(result.value.some((order) => order.id === id));
  assert.deepEqual(await service.listOrders(identity('admin', ['ADMINISTRATOR']), 'requested'), { ok: false, reason: 'forbidden' });
});

test('details enforce participant/admin access and availability for nonparticipants', async () => {
  assert.equal((await service.getOrder(identity(stranger), open)).ok, true);
  for (const id of [overdue, assigned, delivered, cancelled]) {
    assert.deepEqual(await service.getOrder(identity(stranger), id), { ok: false, reason: 'forbidden' });
    assert.equal((await service.getOrder(identity(requester), id)).ok, true);
    assert.equal((await service.getOrder(identity('admin', ['ADMINISTRATOR']), id)).ok, true);
  }
  assert.equal((await service.getOrder(identity(courier), assigned)).ok, true);
  assert.deepEqual(await service.getOrder(identity(stranger), randomUUID()), { ok: false, reason: 'not-found' });
  assert.deepEqual(await service.getOrder(identity('user', []), open), { ok: false, reason: 'forbidden' });
});

test('database constraints reject invalid business records atomically', async () => {
  for (const data of [
    { credits: 0 }, { credits: -1 }, { supplierId: 0n },
    { requestDetails: ' ' }, { destination: '' },
    { courierId: requester }, { status: 'ASSIGNED' as const },
    { status: 'UNASSIGNED' as const, courierId: courier },
    { status: 'DELIVERED' as const, courierId: courier },
    { status: 'CANCELLED' as const },
    { expiryTime: new Date(0) }, { creditState: 'SETTLED' as const },
  ]) await assert.rejects(fixture(data));
});

test('idempotency and credit operation uniqueness are enforced by PostgreSQL', async () => {
  const creation = await db.orderCreation.findUniqueOrThrow({ where: { orderId: open } });
  const duplicateId = randomUUID();
  ids.push(duplicateId);
  await assert.rejects(db.orderCreation.create({ data: {
    orderId: duplicateId, requesterId: creation.requesterId,
    idempotencyKey: creation.idempotencyKey, requestFingerprint: 'same', payload: {},
  } }));
  const operation = await db.creditOperation.create({ data: { orderId: open, type: 'RESERVE', payload: { amount: 4 } } });
  await assert.rejects(db.creditOperation.create({ data: { orderId: open, type: 'RESERVE', payload: { amount: 4 } } }));
  await assert.rejects(db.creditOperation.update({ where: { id: operation.id }, data: { attempts: -1 } }));
});

test('records persist across database clients and API restarts', async () => {
  const fresh = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const persisted = await createOrderService(fresh).getOrder(identity(requester), open);
    assert.ok(persisted.ok);
    assert.equal(persisted.value.id, open);
    assert.equal(persisted.value.status, 'UNASSIGNED');
    const restarted = createApp({
      authProvider: new LocalJwtAuthProvider({ publicKey: keys.publicKey }),
      orders: createOrderService(fresh), pingDatabase: () => pingDatabase(fresh),
    }).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => restarted.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(restarted.address() as AddressInfo).port}/orders/${open}`, {
        headers: { Authorization: `Bearer ${signToken(keys.privateKey, requester)}` },
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { order: { id: string } }).order.id, open);
    } finally {
      restarted.closeAllConnections();
      await new Promise<void>((resolve) => restarted.close(() => resolve()));
    }
  } finally {
    await fresh.$disconnect();
  }
});

test('health performs a real database probe', async () => {
  assert.equal(await pingDatabase(db), true);
  assert.equal((await fetch(baseUrl + '/health')).status, 200);
  const unavailable = new PrismaClient({ datasources: { db: { url: 'postgresql://test:test@127.0.0.1:1/order_service_test?connect_timeout=1' } } });
  try { assert.equal(await pingDatabase(unavailable), false); }
  finally { await unavailable.$disconnect(); }
});
