// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
// Scope: Generated wire-level tests for exact initialization/balance/reservation responses and shared history paging with optional fields and signed deltas.
// Author review: Pending human review.
// Prompts and key responses: ../../../credit-service/ai/usage-log.md, entries 007, 009–012.
// AI-generated; human review pending.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Metadata } = require('@grpc/grpc-js');
const rpc = require('../dist');

test('credit RPCs transport the finalized response shapes without caller idempotency keys', async (t) => {
  const timestamp = { seconds: '1792454400', nanos: 123456000 };
  const common = {
    orderId: '00000000-0000-4000-8000-000000000001',
    requesterId: 'requester',
    amount: 3,
    reservationId: '00000000-0000-4000-8000-000000000002',
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const server = rpc.createServer(rpc.CreditService.service, {
    InitCredits(call, callback) {
      assert.equal(call.request.userId, 'requester');
      assert.equal(Object.hasOwn(call.request, 'idempotencyKey'), false);
      assert.deepEqual(call.metadata.get('x-init-test'), ['initialization']);
      callback(null, {
        userId: call.request.userId, totalCredits: 10, reservedCredits: 0,
        availableCredits: 10, createdAt: timestamp,
      });
    },
    GetBalance(call, callback) {
      assert.equal(call.request.userId, 'requester');
      callback(null, {
        userId: 'requester', totalCredits: 10, reservedCredits: 3, availableCredits: 7,
        createdAt: timestamp, updatedAt: timestamp,
      });
    },
    ReserveCredits(call, callback) {
      assert.equal(call.request.requesterId, common.requesterId);
      assert.equal(call.request.amount, 3);
      assert.equal(Object.hasOwn(call.request, 'creditAmount'), false);
      assert.equal(Object.hasOwn(call.request, 'idempotencyKey'), false);
      callback(null, { ...common, status: 'RESERVED' });
    },
    UpdateReservation(call, callback) {
      assert.equal(call.request.orderId, common.orderId);
      assert.equal(call.request.amount, 5);
      assert.equal(call.request.expectedVersion, 1);
      assert.equal(Object.hasOwn(call.request, 'idempotencyKey'), false);
      callback(null, { ...common, amount: 5, version: 2, status: 'RESERVED' });
    },
    ReleaseCredits(call, callback) {
      assert.equal(call.request.orderId, common.orderId);
      assert.equal(Object.hasOwn(call.request, 'idempotencyKey'), false);
      callback(null, { ...common, status: 'RELEASED' });
    },
    SettleCredits(call, callback) {
      assert.equal(call.request.orderId, common.orderId);
      assert.equal(call.request.courierId, 'courier');
      assert.equal(Object.hasOwn(call.request, 'idempotencyKey'), false);
      callback(null, { ...common, status: 'SETTLED', courierId: call.request.courierId });
    },
    GetReservation(call, callback) {
      assert.equal(call.request.orderId, common.orderId);
      callback(null, { ...common, status: 'SETTLED' });
    },
  });
  const port = await rpc.startServer(server, 0, '127.0.0.1');
  const client = rpc.createCreditClient('127.0.0.1:' + port);
  t.after(async () => {
    client.close();
    await rpc.stopServer(server, 100);
  });

  const initMetadata = new Metadata();
  initMetadata.set('x-init-test', 'initialization');
  assert.deepEqual(await client.initCredits({ userId: 'requester' }, { metadata: initMetadata }), {
    userId: 'requester', totalCredits: 10, reservedCredits: 0, availableCredits: 10,
  });
  assert.deepEqual(await client.getBalance({ userId: 'requester' }), {
    totalCredits: 10, reservedCredits: 3, availableCredits: 7,
  });
  const reserved = await client.reserveCredits({
    orderId: common.orderId, requesterId: common.requesterId,
    amount: 3,
  });
  assert.equal(reserved.reservationId, common.reservationId);
  assert.equal(reserved.amount, 3);
  assert.equal(reserved.version, 1);
  assert.deepEqual(Object.keys(reserved).sort(), ['amount', 'orderId', 'requesterId', 'reservationId', 'status', 'version']);
  assert.equal(reserved.status, 'RESERVED');
  assert.equal(Object.hasOwn(reserved, 'courierId'), false);
  const updated = await client.updateReservation({ orderId: common.orderId, amount: 5, expectedVersion: 1 });
  assert.equal(updated.amount, 5);
  assert.equal(updated.version, 2);
  assert.equal((await client.releaseCredits({ orderId: common.orderId })).status, 'RELEASED');
  const settled = await client.settleCredits({ orderId: common.orderId, courierId: 'courier' });
  assert.equal(settled.status, 'SETTLED');
  assert.equal(settled.courierId, 'courier');
  // proto-loader exposes a synthetic oneof presence marker for optional courierId.
  assert.deepEqual(Object.keys(settled).filter((key) => !key.startsWith('_')).sort(), ['amount', 'courierId', 'orderId', 'requesterId', 'reservationId', 'status', 'version']);
  assert.deepEqual(await client.getReservation({ orderId: common.orderId }), {
    status: 'SETTLED', amount: 3, version: 1,
  });
});

test('both history RPCs share page/entry shapes and preserve pagination, metadata, optional IDs, and signed deltas', async (t) => {
  const entries = [
    {
      id: 'newer-entry', userId: 'requester', orderId: 'order', reservationId: 'reservation',
      type: 'transfer', totalAmountChange: -3, totalReservedChange: -3,
      createdAt: { seconds: '1792454401', nanos: 123456000 },
    },
    {
      id: 'older-entry', userId: 'requester', type: 'init_credits',
      totalAmountChange: 10, totalReservedChange: 0,
      createdAt: { seconds: '1792454400', nanos: 0 },
    },
  ];
  const page = { entries, nextPageToken: 'opaque-next-token' };
  const server = rpc.createServer(rpc.CreditService.service, {
    GetUserCreditHistory(call, callback) {
      assert.equal(call.request.userId, 'requester');
      assert.equal(call.request.pageSize, 2);
      assert.equal(call.request.pageToken, 'opaque-current-token');
      assert.deepEqual(call.metadata.get('x-history-test'), ['user-page']);
      callback(null, page);
    },
    GetOrderCreditHistory(call, callback) {
      assert.equal(call.request.orderId, 'order');
      assert.equal(Object.hasOwn(call.request, 'pageSize'), false);
      assert.equal(Object.hasOwn(call.request, 'pageToken'), false);
      callback(null, page);
    },
  });
  const port = await rpc.startServer(server, 0, '127.0.0.1');
  const client = rpc.createCreditClient('127.0.0.1:' + port);
  t.after(async () => {
    client.close();
    await rpc.stopServer(server, 100);
  });
  const metadata = new Metadata();
  metadata.set('x-history-test', 'user-page');
  const byUser = await client.getUserCreditHistory({
    userId: 'requester', pageSize: 2, pageToken: 'opaque-current-token',
  }, { metadata });
  const byOrder = await client.getOrderCreditHistory({ orderId: 'order' });
  assert.deepEqual(byUser, byOrder);
  assert.equal(byUser.nextPageToken, 'opaque-next-token');
  assert.deepEqual(byUser.entries.map((entry) => entry.id), ['newer-entry', 'older-entry']);
  const first = byUser.entries[0];
  assert.deepEqual({
    id: first.id, userId: first.userId, orderId: first.orderId, reservationId: first.reservationId,
    type: first.type, totalAmountChange: first.totalAmountChange,
    totalReservedChange: first.totalReservedChange, createdAt: first.createdAt,
  }, entries[0]);
  assert.equal(Object.hasOwn(byUser.entries[1], 'orderId'), false);
  assert.equal(Object.hasOwn(byUser.entries[1], 'reservationId'), false);
});
