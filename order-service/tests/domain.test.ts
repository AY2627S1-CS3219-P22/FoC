import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Order } from '../src/generated/prisma';
import { transitionFailure } from '../src/domain/orderRules';
import { createOrderSchema } from '../src/api/dto/createOrderDto';
import { identity } from './helpers';

const now = new Date('2026-10-13T00:00:00Z');
const order = (status: Order['status']) =>
  ({
    requesterId: 'requester',
    courierId: 'courier',
    status,
    expiryTime: new Date(now.getTime() + 1000),
  }) as Order;

test('valid transitions and terminal-state restrictions', () => {
  for (const [status, action, actor] of [
    ['UNASSIGNED', 'accept', 'courier'],
    ['ASSIGNED', 'pickup', 'courier'],
    ['PICKED_UP', 'deliver', 'courier'],
    ['UNASSIGNED', 'cancel', 'requester'],
  ] as const)
    assert.equal(transitionFailure(order(status), identity(actor), action, now), undefined);
  for (const status of ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] as const) {
    if (status !== 'ASSIGNED')
      assert.equal(
        transitionFailure(order(status), identity('courier'), 'pickup', now),
        'invalid-transition',
      );
    if (status !== 'PICKED_UP')
      assert.equal(
        transitionFailure(order(status), identity('courier'), 'deliver', now),
        'invalid-transition',
      );
    if (status !== 'UNASSIGNED')
      assert.equal(
        transitionFailure(order(status), identity('requester'), 'cancel', now),
        'invalid-transition',
      );
  }
});
test('ownership and roles cannot be bypassed', () => {
  assert.equal(
    transitionFailure(order('UNASSIGNED'), identity('requester'), 'accept', now),
    'forbidden',
  );
  assert.equal(
    transitionFailure(order('ASSIGNED'), identity('stranger'), 'pickup', now),
    'forbidden',
  );
  assert.equal(
    transitionFailure(order('PICKED_UP'), identity('requester'), 'deliver', now),
    'forbidden',
  );
  assert.equal(
    transitionFailure(order('UNASSIGNED'), identity('courier'), 'cancel', now),
    'forbidden',
  );
  assert.equal(
    transitionFailure(order('UNASSIGNED'), identity('admin', ['ADMINISTRATOR']), 'accept', now),
    'forbidden',
  );
});
test('expiry includes picked-up orders and applies at deadline equality', () => {
  for (const status of ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP'] as const) {
    assert.equal(
      transitionFailure({ ...order(status), expiryTime: now }, undefined, 'expire', now),
      undefined,
    );
    assert.equal(transitionFailure(order(status), undefined, 'expire', now), 'not-due');
  }
  assert.equal(
    transitionFailure(
      { ...order('PICKED_UP'), expiryTime: now },
      identity('courier'),
      'deliver',
      now,
    ),
    'expired',
  );
  for (const status of ['DELIVERED', 'CANCELLED'] as const)
    assert.equal(
      transitionFailure({ ...order(status), expiryTime: now }, undefined, 'expire', now),
      'invalid-transition',
    );
});
test('creation validates storage bounds, UTC offsets and server-controlled fields', () => {
  const input = {
    supplierId: '9007199254740993',
    destination: ' PGP ',
    requestDetails: ' Latte ',
    credits: 4,
    expiryTime: '2099-01-01T08:00:00+08:00',
  };
  assert.equal(createOrderSchema.parse(input).expiryTime, '2099-01-01T00:00:00.000Z');
  assert.equal(createOrderSchema.parse(input).destination, 'PGP');
  for (const changes of [
    { supplierId: '0' },
    { supplierId: '9223372036854775808' },
    { supplierId: 's1' },
    { credits: 0 },
    { credits: 1.5 },
    { credits: 2147483648 },
    { destination: ' ' },
    { requestDetails: '' },
    { expiryTime: '2099-01-01T08:00:00' },
    { requesterId: 'spoofed' },
    { status: 'DELIVERED' },
    { pickupStore: 'invented' },
  ])
    assert.equal(createOrderSchema.safeParse({ ...input, ...changes }).success, false);
});
