const assert = require('node:assert/strict');
const { test } = require('node:test');
const { OrderRacePolicy } = require('../dist/services/order-race-policy');
const policy = new OrderRacePolicy();
const order = { orderId: 'errand', requesterId: 'requester', status: 'OPEN', version: 1, expiresAt: 1000 };
const command = (operation, overrides = {}) => ({ id: operation, orderId: 'errand', operation,
  actorId: operation === 'ACCEPT' ? 'courier' : 'requester', expectedVersion: 1, submittedAt: 10, ...overrides });
const permutations = values => values.length < 2 ? [values] : values.flatMap((value, index) =>
  permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest]));

test('cancellation beats acceptance and acceptance beats edits regardless of intent arrival order', () => {
  for (const pending of permutations([command('EDIT'), command('ACCEPT'), command('CANCEL')])) {
    const decision = policy.decide(order, pending, 20);
    assert.equal(decision.winner.operation, 'CANCEL');
    assert.equal(decision.creditAction, 'RELEASE_RESERVATION');
    assert.equal(decision.nextStatus, 'CANCELLED');
    assert.equal(decision.rejected.length, 2);
  }
  for (const pending of permutations([command('EDIT'), command('ACCEPT')])) {
    assert.equal(policy.decide(order, pending, 20).winner.operation, 'ACCEPT');
  }
});

test('a reached deadline beats acceptance even before a scheduled expiry command arrives', () => {
  const decision = policy.decide(order, [command('ACCEPT'), command('EDIT')], 1000);
  assert.equal(decision.winner.operation, 'EXPIRE');
  assert.equal(decision.creditAction, 'RELEASE_RESERVATION');
  assert.equal(decision.rejected[0].reason, 'DEADLINE_PASSED');
  const again = policy.decide(order, [], 1001);
  assert.equal(again.winner.id, decision.winner.id);
});

test('acceptance stays blocked while an already initiated edit updates its credit reservation', () => {
  const decision = policy.decide({ ...order, status: 'EDITING', version: 2 }, [command('ACCEPT', { expectedVersion: 2 })], 20);
  assert.equal(decision.winner, undefined);
  assert.equal(decision.rejected[0].reason, 'UPDATE_IN_PROGRESS');
  const edit = policy.decide(order, [command('EDIT')], 20);
  assert.equal(edit.nextStatus, 'EDITING');
  assert.equal(edit.creditAction, 'UPDATE_RESERVATION');
});

test('multiple couriers produce one deterministic winner and committed transitions reject stale requests', () => {
  const attempts = [command('ACCEPT', { id: 'b', actorId: 'courier-b' }), command('ACCEPT', { id: 'a', actorId: 'courier-a' })];
  const first = policy.decide(order, attempts, 20);
  assert.equal(first.winner.id, 'a');
  assert.equal(policy.decide(order, attempts.reverse(), 20).winner.id, 'a');
  assert.equal(policy.decide({ ...order, status: 'ACCEPTED', version: first.nextVersion }, attempts, 21).winner, undefined);
  assert.equal(policy.decide({ ...order, version: 2 }, [command('EDIT')], 20).rejected[0].reason, 'STALE_VERSION');
});

test('unauthorised, self-acceptance, wrong-order and premature expiry intents cannot win', () => {
  const attempts = [command('ACCEPT', { actorId: 'requester' }), command('CANCEL', { actorId: 'other' }),
    command('EDIT', { orderId: 'another-order' }), command('EXPIRE')];
  const decision = policy.decide(order, attempts, 20);
  assert.equal(decision.winner, undefined);
  assert.deepEqual(decision.rejected.map(r => r.reason), ['NOT_AUTHORISED', 'NOT_AUTHORISED', 'WRONG_ORDER', 'INVALID_REQUEST']);
});

test('duplicate command IDs execute once in a cohort and changed payloads are rejected', () => {
  const edit = command('EDIT');
  assert.equal(policy.decide(order, [edit, { ...edit }], 20).rejected.length, 0);
  assert.throws(() => policy.decide(order, [edit, { ...edit, actorId: 'other' }], 20), /different parameters/);
});

test('terminal order states cannot be edited, accepted, cancelled or expired again', () => {
  for (const state of ['COMPLETED', 'CANCELLED', 'EXPIRED', 'DELIVERED', 'PICKED_UP']) {
    assert.equal(policy.decide({ ...order, status: state }, [command('EDIT'), command('ACCEPT')], 20).winner, undefined);
  }
});
