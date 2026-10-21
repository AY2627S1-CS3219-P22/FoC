import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configuredCreditGateway } from '../src/dependencies/configuredCreditGateway';
import { createCreditGateway, type CreditClient } from '../src/dependencies/creditGateway';

const receipt = { orderId: 'order', requesterId: 'user', amount: 4, status: 'RESERVED', courierId: '' };
function setup() {
  const calls: { method: string; input: unknown; options: unknown }[] = [];
  let response: unknown = receipt;
  let error: unknown;
  const invoke = (method: string) => async (input: unknown, options: unknown) => {
    calls.push({ method, input, options });
    if (error) throw error;
    return response;
  };
  const client: CreditClient<{ deadline: number; token: string }> = {
    getBalance: invoke('balance'), reserveCredits: invoke('reserve'), releaseCredits: invoke('release'),
    settleCredits: invoke('settle'), getReservation: invoke('lookup'),
  };
  let sequence = 0;
  const gateway = createCreditGateway(client, () => ({ deadline: ++sequence, token: 'test-only' }));
  return { gateway, calls, response(value: unknown) { response = value; }, error(value: unknown) { error = value; } };
}
test('adapter maps commands, keeps tracking IDs local and supplies per-call options', async () => {
  const s = setup();
  await s.gateway.reserve({ orderId: 'order', requesterId: 'user', amount: 4, operationId: 'local' });
  await s.gateway.refund({ orderId: 'order', operationId: 'local-refund' });
  await s.gateway.settle({ orderId: 'order', courierId: 'courier', operationId: 'local-settle' });
  await s.gateway.getReservation('order');
  assert.deepEqual(s.calls.map(c => [c.method, c.input]), [
    ['reserve', { orderId: 'order', requesterId: 'user', amount: 4 }],
    ['release', { orderId: 'order' }], ['settle', { orderId: 'order', courierId: 'courier' }],
    ['lookup', { orderId: 'order' }],
  ]);
  assert.deepEqual(s.calls.map(c => c.options), [1, 2, 3, 4].map(deadline => ({ deadline, token: 'test-only' })));
});
test('exhausted transport retries are uncertain; repairable configuration/account errors stay retryable', async () => {
  const s = setup();
  for (const code of [4, 10, 14, 2, 13]) {
    s.error({ code, details: 'secret must not escape' });
    assert.deepEqual(await s.gateway.refund({ orderId: 'order', operationId: 'local' }), { kind: 'unknown', code, reason: 'transport' });
  }
  for (const [code, reason] of [[5, 'missing-account-or-reservation'], [7, 'permission'], [16, 'authentication']] as const) {
    s.error({ code });
    assert.deepEqual(await s.gateway.settle({ orderId: 'order', courierId: 'courier', operationId: 'local' }), { kind: 'unavailable', code, reason });
  }
  for (const [code, reason] of [[3, 'invalid-input'], [9, 'precondition']] as const) {
    s.error({ code });
    assert.deepEqual(await s.gateway.getReservation('order'), { kind: 'rejected', code, reason });
  }
});
test('malformed receipts and wrong-user balance responses cannot confirm financial success', async () => {
  const s = setup();
  for (const value of [null, { ...receipt, amount: 0 }, { ...receipt, status: 'SETTLED' }, { ...receipt, status: 'UNKNOWN' }]) {
    s.response(value);
    assert.deepEqual(await s.gateway.getReservation('order'), { kind: 'unknown', reason: 'protocol' });
  }
  s.response({ userId: 'other', availableCredits: 10 });
  assert.deepEqual(await s.gateway.getBalance('user'), { kind: 'unknown', reason: 'protocol' });
  s.response({ userId: 'user', availableCredits: 0 });
  assert.deepEqual(await s.gateway.getBalance('user'), { kind: 'confirmed', value: { availableCredits: 0 } });
});

test('configured connection refuses incomplete credentials and insecure remote targets', async () => {
  assert.equal(configuredCreditGateway({ CREDIT_RPC_TIMEOUT_MS: 3000 }), undefined);
  assert.throws(() => configuredCreditGateway({ CREDIT_GRPC_ADDR: '127.0.0.1:50054', CREDIT_RPC_TIMEOUT_MS: 3000 }), /credential/);
  assert.throws(() => configuredCreditGateway({ CREDIT_GRPC_ADDR: 'credit-service:50054', CREDIT_ORDER_SERVICE_TOKEN: 'test-only', CREDIT_RPC_TIMEOUT_MS: 3000 }), /TLS/);
});

test('configured adapter sends service metadata and decodes current receipts over real gRPC', async () => {
  const { createServer, CreditService, startServer, stopServer } = await import('@foc/grpc');
  const { ServerCredentials } = await import('@grpc/grpc-js');
  const server = createServer(CreditService.service, {
    GetReservation(call: any, callback: any) {
      assert.equal(call.metadata.get('x-credit-service-token')[0], 'test-only');
      assert.equal(call.request.orderId, 'order');
      callback(null, { ...receipt, status: 'RELEASED', reservationId: 'reservation', version: 2 });
    },
  });
  const port = await startServer(server, 0, '127.0.0.1', ServerCredentials.createInsecure());
  const connection = configuredCreditGateway({ CREDIT_GRPC_ADDR: `127.0.0.1:${port}`, CREDIT_ORDER_SERVICE_TOKEN: 'test-only', CREDIT_RPC_TIMEOUT_MS: 1000 })!;
  try {
    const result = await connection.gateway.getReservation('order');
    assert.ok(result.kind === 'confirmed');
    assert.equal(result.value.status, 'RELEASED');
  } finally {
    connection.close();
    await stopServer(server, 100);
  }
});


test('configured adapter retries transient failures with the same payload and metadata', async () => {
  const { createServer, CreditService, startServer, stopServer } = await import('@foc/grpc');
  let attempts = 0;
  const server = createServer(CreditService.service, {
    ReserveCredits(call: any, callback: any) {
      assert.equal(call.metadata.get('x-credit-service-token')[0], 'test-only');
      assert.deepEqual(call.request, { orderId: 'order', requesterId: 'user', amount: 4 });
      attempts++;
      if (attempts < 3) return callback({ code: attempts === 1 ? 14 : 10, details: 'transient' });
      callback(null, { ...receipt, reservationId: 'reservation', version: 1 });
    },
  });
  const port = await startServer(server, 0, '127.0.0.1');
  const connection = configuredCreditGateway({ CREDIT_GRPC_ADDR: `127.0.0.1:${port}`,
    CREDIT_ORDER_SERVICE_TOKEN: 'test-only', CREDIT_RPC_TIMEOUT_MS: 2000 })!;
  try {
    assert.equal((await connection.gateway.reserve({ ...receipt, operationId: 'local' })).kind, 'confirmed');
    assert.equal(attempts, 3);
  } finally { connection.close(); await stopServer(server, 100); }
});
