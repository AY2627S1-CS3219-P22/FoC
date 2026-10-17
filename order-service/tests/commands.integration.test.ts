import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { before, after, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma';
import { createOrderCommands, type CommandResult } from '../src/api/services/orderCommands';
import { createOrderService } from '../src/api/services/orderService';
import { createApp } from '../src/api/app';
import { LocalJwtAuthProvider } from '../src/auth/localJwtAuthProvider';
import { fakeDependencies } from './fakeDependencies';
import { createKeys, identity, signToken } from './helpers';
import type { CreateOrderInput } from '../src/api/dto/createOrderDto';

const url = process.env.TEST_DATABASE_URL;
if (!url || !/^\/order_service_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname))
  throw new Error('A dedicated TEST_DATABASE_URL is required.');
const db = new PrismaClient({ datasources: { db: { url } } });
const run = randomUUID();
const requester = identity(`${run}-requester`),
  courier = identity(`${run}-courier`),
  stranger = identity(`${run}-stranger`);
const keys = createKeys();
const fake = fakeDependencies();
const commands = createOrderCommands(db, fake.dependencies);
const input = (changes: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  supplierId: '1',
  destination: 'PGP',
  requestDetails: 'One latte',
  credits: 4,
  expiryTime: new Date(Date.now() + 86_400_000).toISOString(),
  ...changes,
});
function created(result: CommandResult) {
  assert.ok(result.ok, JSON.stringify(result));
  return result.order;
}
async function makeOrder() {
  return created(await commands.createOrder(requester, input(), randomUUID()));
}
before(() => {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
});
after(async () => {
  try {
    const ids = (
      await db.orderCreation.findMany({
        where: { requesterId: requester.id },
        select: { orderId: true },
      })
    ).map((row) => row.orderId);
    await db.creditOperation.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.orderCreation.deleteMany({ where: { orderId: { in: ids } } });
  } finally {
    await db.$disconnect();
  }
});

test('production defaults gate external writes without side effects', async () => {
  const unconfigured = createOrderCommands(db);
  const count = await db.orderCreation.count();
  assert.deepEqual(await unconfigured.createOrder(requester, input(), 'disabled'), {
    ok: false,
    reason: 'dependency-unavailable',
  });
  assert.equal(await db.orderCreation.count(), count);
  assert.deepEqual(await unconfigured.transition(requester, randomUUID(), 'cancel'), {
    ok: false,
    reason: 'dependency-unavailable',
  });
  assert.deepEqual(await unconfigured.expireOrders(), {
    ok: false,
    reason: 'dependency-unavailable',
  });
});
test('creation publishes after confirmation and repeats without new debit', async () => {
  const data = input(),
    key = randomUUID(),
    before = fake.counts().debits;
  const first = await commands.createOrder(requester, data, key),
    order = created(first);
  assert.equal(first.ok && first.created, true);
  assert.equal(order.status, 'UNASSIGNED');
  assert.equal(order.creditState, 'RESERVED');
  assert.equal(order.pickupStore, 'Test Cafe');
  assert.equal(order.requesterId, requester.id);
  assert.equal(created(await commands.createOrder(requester, data, key)).id, order.id);
  assert.equal(fake.counts().debits, before + 1);
  assert.deepEqual(await commands.createOrder(requester, { ...data, credits: 5 }, key), {
    ok: false,
    reason: 'conflict',
  });
});
test('concurrent creation requests preserve one order and reservation', async () => {
  const data = input(),
    key = randomUUID(),
    before = fake.counts().debits;
  const results = await Promise.all([
    commands.createOrder(requester, data, key),
    commands.createOrder(requester, data, key),
  ]);
  assert.equal(created(results[0]).id, created(results[1]).id);
  assert.equal(fake.counts().debits, before + 1);
});
test('uncertain or mismatched reservation response cannot publish', async () => {
  const data = input(),
    key = randomUUID(),
    before = fake.counts().debits;
  fake.control.reserveUnknownOnce = true;
  const pending = await commands.createOrder(requester, data, key);
  assert.ok(!pending.ok && pending.reason === 'pending');
  assert.equal(await db.order.findUnique({ where: { id: pending.creationId! } }), null);
  assert.equal(created(await commands.createOrder(requester, data, key)).id, pending.creationId);
  assert.equal(fake.counts().debits, before + 1);
  fake.control.mismatchReservation = true;
  const badKey = randomUUID(),
    mismatch = await commands.createOrder(requester, data, badKey);
  assert.ok(!mismatch.ok && mismatch.reason === 'pending');
  fake.control.mismatchReservation = false;
  created(await commands.createOrder(requester, data, badKey));
  fake.control.reserveThrowOnce = true;
  const throwKey = randomUUID(),
    lostResponse = await commands.createOrder(requester, data, throwKey);
  assert.ok(!lostResponse.ok && lostResponse.reason === 'pending');
  assert.equal(
    created(await commands.createOrder(requester, data, throwKey)).id,
    lostResponse.creationId,
  );
});
test('reservation rejection, invalid snapshots and expired inputs publish nothing', async () => {
  fake.control.rejectReservation = true;
  const rejected = await commands.createOrder(requester, input(), randomUUID());
  assert.ok(!rejected.ok && rejected.reason === 'dependency-rejected');
  assert.equal(await db.order.findUnique({ where: { id: rejected.creationId! } }), null);
  fake.control.rejectReservation = false;
  const insufficient = await commands.createOrder(
    requester,
    input({ credits: 1001 }),
    randomUUID(),
  );
  assert.ok(!insufficient.ok && insufficient.reason === 'dependency-rejected');
  assert.deepEqual(
    await commands.createOrder(
      requester,
      input({ expiryTime: new Date(0).toISOString() }),
      randomUUID(),
    ),
    { ok: false, reason: 'expired' },
  );
  const invalid = createOrderCommands(db, {
    ...fake.dependencies,
    users: {
      async getPublicProfile() {
        return { kind: 'confirmed', value: { userId: 'spoofed', name: 'Wrong' } };
      },
    },
  });
  assert.deepEqual(await invalid.createOrder(requester, input(), randomUUID()), {
    ok: false,
    reason: 'dependency-rejected',
  });
});
test('publication failure retains confirmed reservation for retry', async () => {
  const brokenDb = db.$extends({
    query: {
      order: {
        create() {
          throw new Error('Simulated persistence failure');
        },
      },
    },
  });
  const broken = createOrderCommands(brokenDb as unknown as PrismaClient, fake.dependencies);
  const data = input(),
    key = randomUUID(),
    before = fake.counts().debits;
  await assert.rejects(broken.createOrder(requester, data, key), /Simulated persistence failure/);
  const creation = await db.orderCreation.findUniqueOrThrow({
    where: { requesterId_idempotencyKey: { requesterId: requester.id, idempotencyKey: key } },
  });
  assert.equal(creation.state, 'PENDING');
  created(await commands.createOrder(requester, data, key));
  assert.equal(fake.counts().debits, before + 1);
});
test('expiry during reservation refunds rather than publishing', async () => {
  const deadline = Date.now() + 3000;
  fake.control.afterReserve = async () => {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - Date.now() + 50)));
  };
  const before = fake.counts().refunds;
  const result = await commands.createOrder(
    requester,
    input({ expiryTime: new Date(deadline).toISOString() }),
    randomUUID(),
  );
  assert.ok(!result.ok && result.reason === 'expired');
  assert.equal(await db.order.findUnique({ where: { id: result.creationId! } }), null);
  assert.equal(fake.counts().refunds, before + 1);
});
test('one courier wins acceptance and pickup enforces state/ownership', async () => {
  const order = await makeOrder();
  assert.deepEqual(await commands.transition(requester, order.id, 'accept'), {
    ok: false,
    reason: 'forbidden',
  });
  const contenders = await Promise.all([
    commands.transition(courier, order.id, 'accept'),
    commands.transition(stranger, order.id, 'accept'),
  ]);
  assert.equal(contenders.filter((result) => result.ok).length, 1);
  const assigned = created(contenders.find((result) => result.ok)!);
  const winner = assigned.courierId === courier.id ? courier : stranger,
    loser = assigned.courierId === courier.id ? stranger : courier;
  assert.deepEqual(await commands.transition(loser, order.id, 'pickup'), {
    ok: false,
    reason: 'forbidden',
  });
  assert.deepEqual(await commands.transition(requester, order.id, 'cancel'), {
    ok: false,
    reason: 'invalid-transition',
  });
  assert.equal(created(await commands.transition(winner, order.id, 'pickup')).status, 'PICKED_UP');
  assert.deepEqual(await commands.transition(winner, order.id, 'pickup'), {
    ok: false,
    reason: 'invalid-transition',
  });
});
test('lost settlement response stays pending and replay settles once', async () => {
  const order = await makeOrder();
  await commands.transition(courier, order.id, 'accept');
  assert.deepEqual(await commands.transition(courier, order.id, 'deliver'), {
    ok: false,
    reason: 'invalid-transition',
  });
  await commands.transition(courier, order.id, 'pickup');
  const before = fake.counts().settlements;
  fake.control.settleUnknownOnce = true;
  const result = await commands.transition(courier, order.id, 'deliver');
  assert.ok(result.ok && result.pending);
  assert.equal(result.order.status, 'DELIVERED');
  assert.equal(result.order.creditState, 'SETTLEMENT_PENDING');
  assert.deepEqual(await commands.transition(stranger, order.id, 'deliver'), {
    ok: false,
    reason: 'forbidden',
  });
  assert.equal(
    created(await commands.transition(courier, order.id, 'deliver')).creditState,
    'SETTLED',
  );
  await commands.transition(courier, order.id, 'deliver');
  assert.equal(fake.counts().settlements, before + 1);
  assert.deepEqual(await commands.transition(courier, order.id, 'pickup'), {
    ok: false,
    reason: 'invalid-transition',
  });
});
test('requester cancellation refunds once after an uncertain response', async () => {
  const order = await makeOrder(),
    before = fake.counts().refunds;
  assert.deepEqual(await commands.transition(stranger, order.id, 'cancel'), {
    ok: false,
    reason: 'forbidden',
  });
  fake.control.refundUnknownOnce = true;
  const result = await commands.transition(requester, order.id, 'cancel');
  assert.ok(result.ok && result.pending);
  assert.equal(
    created(await commands.transition(requester, order.id, 'cancel')).creditState,
    'REFUNDED',
  );
  await commands.transition(requester, order.id, 'cancel');
  assert.equal(fake.counts().refunds, before + 1);
});
test('expiry includes pickup and concurrent batches refund each order once', async () => {
  const orders = await Promise.all([makeOrder(), makeOrder(), makeOrder()]);
  await commands.transition(courier, orders[1].id, 'accept');
  await commands.transition(courier, orders[2].id, 'accept');
  await commands.transition(courier, orders[2].id, 'pickup');
  await db.order.updateMany({
    where: { id: { in: orders.map((order) => order.id) } },
    data: {
      createdAt: new Date(Date.now() - 86_400_000),
      expiryTime: new Date(Date.now() - 1000),
    },
  });
  assert.deepEqual(await commands.transition(courier, orders[2].id, 'deliver'), {
    ok: false,
    reason: 'expired',
  });
  const before = fake.counts().refunds;
  const results = await Promise.all([commands.expireOrders(), commands.expireOrders()]);
  assert.equal(
    results.reduce((sum, result) => sum + (result.ok ? result.cancelled : 0), 0),
    3,
  );
  for (const order of orders) {
    const row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(row.status, 'CANCELLED');
    assert.equal(row.cancellationReason, 'EXPIRY');
    assert.equal(row.creditState, 'REFUNDED');
  }
  await commands.expireOrders();
  assert.equal(fake.counts().refunds, before + 3);
});
test('pending expiry refunds are recovered through leased batches without double refund', async () => {
  const order = await makeOrder(),
    before = fake.counts().refunds;
  await db.order.update({
    where: { id: order.id },
    data: {
      createdAt: new Date(Date.now() - 86_400_000),
      expiryTime: new Date(Date.now() - 1000),
    },
  });
  fake.control.refundUnknownOnce = true;
  const expired = await commands.expireOrders();
  assert.ok(expired.ok && expired.pendingCredits === 1);
  // Simulate a crashed worker whose lease has expired.
  await db.creditOperation.update({
    where: { orderId_type: { orderId: order.id, type: 'REFUND' } },
    data: {
      state: 'PROCESSING',
      leaseExpiresAt: new Date(Date.now() - 1000),
    },
  });
  const recovered = await Promise.all([
    commands.retryPendingCredits(),
    commands.retryPendingCredits(),
  ]);
  assert.equal(
    recovered.reduce((sum, result) => sum + (result.ok ? result.completed : 0), 0),
    1,
  );
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: order.id } })).creditState,
    'REFUNDED',
  );
  assert.equal(fake.counts().refunds, before + 1);
});
test('HTTP create and lifecycle routes use JWT identity and correct responses', async () => {
  let server: Server | undefined;
  try {
    server = createApp({
      authProvider: new LocalJwtAuthProvider({ publicKey: keys.publicKey }),
      orders: createOrderService(db),
      commands,
      pingDatabase: async () => true,
    }).listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const headers = {
      Authorization: `Bearer ${signToken(keys.privateKey, requester.id)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    };
    const data = input();
    const response = await fetch(base + '/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as { order: { id: string; requesterId: string } };
    assert.equal(body.order.requesterId, requester.id);
    assert.equal(
      (await fetch(base + '/orders', { method: 'POST', headers, body: JSON.stringify(data) }))
        .status,
      200,
    );
    assert.equal(
      (
        await fetch(base + '/orders', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...data, requesterId: stranger.id }),
        })
      ).status,
      400,
    );
    assert.equal(
      (await fetch(base + `/orders/${body.order.id}/accept`, { method: 'POST', headers })).status,
      403,
    );
    for (const action of ['accept', 'pickup'])
      assert.equal(
        (
          await fetch(base + `/orders/${body.order.id}/${action}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${signToken(keys.privateKey, courier.id)}` },
          })
        ).status,
        200,
      );
    const courierHeaders = { Authorization: `Bearer ${signToken(keys.privateKey, courier.id)}` };
    fake.control.settleUnknownOnce = true;
    const delivered = await fetch(base + `/orders/${body.order.id}/deliver`, {
      method: 'POST',
      headers: courierHeaders,
    });
    assert.equal(delivered.status, 202);
    assert.equal(
      ((await delivered.json()) as { order: { creditState: string } }).order.creditState,
      'SETTLEMENT_PENDING',
    );
    assert.equal(
      (
        await fetch(base + `/orders/${body.order.id}/deliver`, {
          method: 'POST',
          headers: courierHeaders,
        })
      ).status,
      200,
    );
    const pendingHeaders = { ...headers, 'Idempotency-Key': randomUUID() };
    fake.control.reserveUnknownOnce = true;
    const pending = await fetch(base + '/orders', {
      method: 'POST',
      headers: pendingHeaders,
      body: JSON.stringify(data),
    });
    assert.equal(pending.status, 202);
    const pendingBody = (await pending.json()) as { creationId: string; state: string };
    assert.equal(pendingBody.state, 'PENDING');
    assert.equal(await db.order.findUnique({ where: { id: pendingBody.creationId } }), null);
    assert.equal(
      (
        await fetch(base + '/orders', {
          method: 'POST',
          headers: pendingHeaders,
          body: JSON.stringify(data),
        })
      ).status,
      201,
    );
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
  }
});

test('uncertain reservation recovery bypasses an unavailable balance precheck', async () => {
  const local = fakeDependencies();
  const core = createOrderCommands(db, local.dependencies);
  const data = input(), key = randomUUID();
  local.control.reserveUnknownOnce = true;
  const pending = await core.createOrder(requester, data, key);
  assert.ok(!pending.ok && pending.reason === 'pending');
  local.dependencies.credits!.getBalance = async () => ({ kind: 'unavailable' });
  assert.equal(created(await core.createOrder(requester, data, key)).id, pending.creationId);
  assert.equal(local.counts().debits, 1);
});

test('historical reserve success cannot publish a currently released reservation', async () => {
  const local = fakeDependencies();
  const original = local.dependencies.credits!.reserve;
  local.dependencies.credits!.reserve = async request => {
    const response = await original(request);
    local.reservations.get(request.orderId)!.status = 'RELEASED';
    return response; // Original successful response, rather than current state.
  };
  const core = createOrderCommands(db, local.dependencies);
  const data = input(), key = randomUUID();
  const result = await core.createOrder(requester, data, key);
  assert.ok(!result.ok && result.reason === 'pending');
  assert.equal(await db.order.findUnique({ where: { id: result.creationId! } }), null);
  // The persisted successful reserve receipt must also be rechecked on replay.
  const replay = await core.createOrder(requester, data, key);
  assert.ok(!replay.ok && replay.reason === 'pending');
});

test('repairable settlement failures retain a retryable intent and sanitized diagnostics', async () => {
  const local = fakeDependencies();
  const core = createOrderCommands(db, local.dependencies);
  const order = created(await core.createOrder(requester, input(), randomUUID()));
  await core.transition(courier, order.id, 'accept');
  await core.transition(courier, order.id, 'pickup');
  const settle = local.dependencies.credits!.settle;
  local.dependencies.credits!.settle = async () => ({ kind: 'unavailable', code: 5, reason: 'missing-account-or-reservation' });
  const pending = await core.transition(courier, order.id, 'deliver');
  assert.ok(pending.ok && pending.pending);
  const operation = await db.creditOperation.findUniqueOrThrow({ where: { orderId_type: { orderId: order.id, type: 'SETTLE' } } });
  assert.equal(operation.state, 'PENDING');
  assert.equal(operation.lastError, 'unavailable:5:missing-account-or-reservation');
  local.dependencies.credits!.settle = settle;
  await core.retryPendingCredits();
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).creditState, 'SETTLED');
});
