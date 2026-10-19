const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { createRequire } = require('node:module');
require('tsx/cjs');
const { status, Metadata } = require('@grpc/grpc-js');
const rpc = require('../dist');
const userServer = require('../../../user-service/src/grpc/server.ts');
// Existing services may have their own dependency installation. Server credentials
// must come from the same grpc-js instance that constructed the existing server.
const userRequire = createRequire(path.resolve(__dirname, '../../../user-service/package.json'));
const userCredentials = userRequire('@grpc/grpc-js').ServerCredentials;
const orderServer = require('../../../order-service/grpc/dist/grpc/server.js');
const supplierServer = require('../../../supplier-service/grpc/dist/grpc/server.js');

async function listen(t, server, createClient, config, serverCredentials) {
  const port = await rpc.startServer(server, 0, '127.0.0.1', serverCredentials);
  const client = createClient('127.0.0.1:' + port, config);
  t.after(async () => {
    client.close();
    await rpc.stopServer(server, 100);
  });
  return client;
}

test('scaffolds and credit transport stubs return UNIMPLEMENTED', async (t) => {
  const user = await listen(
    t,
    userServer.createGrpcServer(),
    rpc.createUserClient,
    undefined,
    userCredentials.createInsecure(),
  );
  const order = await listen(t, orderServer.createGrpcServer(), rpc.createOrderClient);
  const creditStub = rpc.createServer(rpc.CreditService.service, Object.fromEntries(
    Object.keys(rpc.CreditService.service).map(method => [method, rpc.unimplemented(method)]),
  ));
  const credit = await listen(t, creditStub, rpc.createCreditClient);
  const supplier = await listen(t, supplierServer.createGrpcServer(), rpc.createSupplierClient);

  for (const invoke of [
    () => user.getPublicProfile({ userId: 'user-1' }),
    () => order.getOrder({ orderId: 'order-1' }),
    () => credit.getBalance({ userId: 'user-1' }),
    () => credit.initCredits({ userId: 'user-1' }),
    () => credit.getCreditHistory({ userId: 'user-1' }),
    () => credit.updateReservation({ orderId: 'order-1', amount: 2, expectedVersion: 1 }),
    () => credit.reserveCredits({ orderId: 'order-1', requesterId: 'user-1', amount: 4 }),
    () => credit.releaseCredits({ orderId: 'order-1' }),
    () => credit.settleCredits({ orderId: 'order-1', courierId: 'user-2' }),
    () => credit.getReservation({ orderId: 'order-1' }),
    () => supplier.getSupplier({ supplierId: '1' }),
  ]) {
    await assert.rejects(invoke(), (error) => error.code === status.UNIMPLEMENTED);
  }
});

test('public profile fields use the existing user wire contract', async (t) => {
  const profile = { userId: 'u1', username: 'student', firstName: 'Campus', lastName: 'Friend' };
  const server = rpc.createServer(rpc.UserService.service, {
    GetPublicProfile(call, callback) {
      assert.equal(call.request.userId, 'u1');
      callback(null, profile);
    },
  });
  const client = await listen(t, server, rpc.createUserClient);
  assert.deepEqual(await client.getPublicProfile({ userId: 'u1' }), profile);
});

test('supplier bigint IDs retain precision and floors are integers', async (t) => {
  const id = '9007199254740993';
  const server = rpc.createServer(rpc.SupplierService.service, {
    GetSupplier(call, callback) {
      assert.equal(call.request.supplierId, id);
      callback(null, {
        supplierId: id,
        name: 'NUS Co-op',
        type: 'shopping',
        buildingName: 'Central Library',
        floor: 1,
        locationDescription: 'Inside the library',
        latitude: 1.2967,
        longitude: 103.7732,
      });
    },
    IsOpen: rpc.unimplemented('IsOpen'),
  });
  const client = await listen(t, server, rpc.createSupplierClient);
  const supplier = await client.getSupplier({ supplierId: id });
  assert.equal(supplier.supplierId, id);
  assert.equal(supplier.floor, 1);
  assert.equal(supplier.buildingName, 'Central Library');
  assert.equal(supplier.startingTime, undefined);
});

test('supplier IsOpen returns a boolean', async (t) => {
  const server = rpc.createServer(rpc.SupplierService.service, {
    GetSupplier: rpc.unimplemented('GetSupplier'),
    IsOpen(call, callback) {
      assert.equal(call.request.supplierId, '1');
      callback(null, { isOpen: true });
    },
  });
  const client = await listen(t, server, rpc.createSupplierClient);
  assert.deepEqual(await client.isOpen({ supplierId: '1' }), { isOpen: true });
});

test('metadata and gRPC error codes/details survive the client wrapper', async (t) => {
  const metadata = new Metadata();
  metadata.set('x-request-id', 'grpc-test');
  const server = rpc.createServer(rpc.CreditService.service, {
    GetBalance(call, callback) {
      assert.deepEqual(call.metadata.get('x-request-id'), ['grpc-test']);
      callback({ code: status.INVALID_ARGUMENT, details: 'userId is required' });
    },
  });
  const client = await listen(t, server, rpc.createCreditClient);
  await assert.rejects(
    client.getBalance({}, { metadata }),
    (error) => error.code === status.INVALID_ARGUMENT && error.details === 'userId is required',
  );
});

test('clients enforce a finite timeout and respect an earlier upstream deadline', async (t) => {
  let receivedDeadline;
  const server = rpc.createServer(rpc.CreditService.service, {
    GetBalance(call, callback) {
      if (call.request.userId === 'ready') {
        callback(null, { userId: 'ready', availableCredits: 0, reservedCredits: 0 });
      } else {
        receivedDeadline = call.getDeadline();
        // Intentionally leave this test RPC pending until its deadline.
      }
    },
  });
  const client = await listen(t, server, rpc.createCreditClient, { timeoutMs: 150 });
  await client.getBalance({ userId: 'ready' }, { timeoutMs: 3000 });
  await assert.rejects(
    client.getBalance({ userId: 'slow' }),
    (error) => error.code === status.DEADLINE_EXCEEDED,
  );
  const deadline = Date.now() + 150;
  await assert.rejects(
    client.getBalance(
      { userId: 'slow' },
      {
        timeoutMs: 3000,
        deadline: new Date(deadline),
      },
    ),
    (error) => error.code === status.DEADLINE_EXCEEDED,
  );
  assert.ok(receivedDeadline <= deadline + 20);
});

// Answers each GetBalance attempt with the next scripted outcome and records what it received.
async function scriptedCredit(t, outcomes, config) {
  const received = [];
  const server = rpc.createServer(rpc.CreditService.service, {
    GetBalance(call, callback) {
      received.push({ request: call.request, requestId: call.metadata.get('x-request-id') });
      const code = outcomes[Math.min(received.length, outcomes.length) - 1];
      if (code === status.OK) callback(null, { userId: call.request.userId, totalCredits: 10, availableCredits: 10 });
      else callback({ code, details: 'scripted failure' });
    },
  });
  const client = await listen(t, server, rpc.createCreditClient, { retry: { initialBackoffMs: 1, maxBackoffMs: 5 }, ...config });
  return { client, received };
}

test('credit client resends the identical request after transient failures', async (t) => {
  const { client, received } = await scriptedCredit(t, [status.UNAVAILABLE, status.ABORTED, status.OK]);
  const metadata = new Metadata();
  metadata.set('x-request-id', 'retry-test');
  assert.equal((await client.getBalance({ userId: 'u1' }, { metadata })).totalCredits, 10);
  assert.equal(received.length, 3);
  for (const attempt of received) {
    assert.equal(attempt.request.userId, 'u1');
    assert.deepEqual(attempt.requestId, ['retry-test']);
  }
});

test('credit client stops after the configured attempts and reports the last failure', async (t) => {
  const { client, received } = await scriptedCredit(t, [status.UNAVAILABLE], { retry: { maxAttempts: 4, initialBackoffMs: 1 } });
  await assert.rejects(client.getBalance({ userId: 'u1' }), (error) => error.code === status.UNAVAILABLE);
  assert.equal(received.length, 4);
});

test('credit client never retries business, permission or unexpected errors', async (t) => {
  for (const code of [status.INVALID_ARGUMENT, status.NOT_FOUND, status.FAILED_PRECONDITION,
    status.PERMISSION_DENIED, status.UNAUTHENTICATED, status.INTERNAL, status.UNIMPLEMENTED]) {
    const { client, received } = await scriptedCredit(t, [code]);
    await assert.rejects(client.getBalance({ userId: 'u1' }), (error) => error.code === code);
    assert.equal(received.length, 1);
  }
});

test('credit client retries can be disabled', async (t) => {
  const { client, received } = await scriptedCredit(t, [status.UNAVAILABLE, status.OK], { retry: { maxAttempts: 1 } });
  await assert.rejects(client.getBalance({ userId: 'u1' }), (error) => error.code === status.UNAVAILABLE);
  assert.equal(received.length, 1);
});

test('credit client retries stay within the upstream deadline', async (t) => {
  const { client, received } = await scriptedCredit(t, [status.ABORTED],
    { retry: { maxAttempts: 10, initialBackoffMs: 40, maxBackoffMs: 40 } });
  const started = Date.now();
  await assert.rejects(client.getBalance({ userId: 'u1' }, { deadline: started + 100 }),
    (error) => error.code === status.ABORTED || error.code === status.DEADLINE_EXCEEDED);
  assert.ok(Date.now() - started < 200);
  assert.ok(received.length < 10);
});

test('credit client rejects invalid retry policies', () => {
  for (const retry of [{ maxAttempts: 0 }, { maxAttempts: 11 }, { maxAttempts: 1.5 }, { initialBackoffMs: -1 }, { maxBackoffMs: Infinity }]) {
    assert.throws(() => rpc.createCreditClient('127.0.0.1:1', { retry }), RangeError);
  }
});

test('credit client rejects fractional or out-of-range numbers before sending', async (t) => {
  const received = [];
  const reply = (call, callback) => { received.push(call.request); callback(null, { orderId: 'o', amount: 1 }); };
  const server = rpc.createServer(rpc.CreditService.service, {
    ReserveCredits: reply, UpdateReservation: reply,
    GetCreditHistory: (call, callback) => { received.push(call.request); callback(null, { entries: [] }); },
  });
  const client = await listen(t, server, rpc.createCreditClient);
  const invalid = [
    () => client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: 3.55 }),
    () => client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: 0.5 }),
    () => client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: 2147483648 }),
    () => client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: Number.NaN }),
    () => client.updateReservation({ orderId: 'o', amount: 10.5, expectedVersion: 1 }),
    () => client.updateReservation({ orderId: 'o', amount: 2, expectedVersion: 1.5 }),
    () => client.updateReservation({ orderId: 'o', amount: 2, expectedVersion: -1 }),
    () => client.getCreditHistory({ userId: 'u', pageSize: 2.5 }),
  ];
  for (const invoke of invalid) {
    await assert.rejects(invoke(), (error) => error.code === status.INVALID_ARGUMENT && /whole number|supported range/.test(error.details));
  }
  assert.equal(received.length, 0);
  // Whole numbers still reach the server, which owns the business rules (e.g. positive amounts).
  await client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: 3 });
  await client.reserveCredits({ orderId: 'o', requesterId: 'u', amount: -1 });
  await client.updateReservation({ orderId: 'o', amount: 2, expectedVersion: 1 });
  await client.getCreditHistory({ userId: 'u' });
  assert.deepEqual(received.map((r) => r.amount ?? r.pageSize), [3, -1, 2, 0]);
});
