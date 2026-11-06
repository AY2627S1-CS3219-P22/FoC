// AI-assisted (Claude), reviewed and tested by Maliha
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterMessage } from '../src/filter';
import type { Order } from '../src/orders';
import { chatAccess } from '../src/rules';

test('normal messages go through untouched', () => {
  for (const text of ["I'm outside COM3", 'skills', 'assess the queue', 'I will find you a table']) {
    assert.deepEqual(filterMessage(text), { action: 'ok', text });
  }
});

test('swearing is masked, even with leetspeak', () => {
  const a = filterMessage('this queue is fucking long');
  assert.equal(a.action, 'masked');
  assert.ok('text' in a && !a.text.includes('fuck'));

  assert.equal(filterMessage('sh1t').action, 'masked');
});

test('threats and self-harm messages are blocked', () => {
  for (const text of ['kys', 'k y s', 'go kill yourself', "I'll kill you", 'go die']) {
    assert.deepEqual(filterMessage(text), { action: 'blocked' }, text);
  }
});

const MIN = 60_000;
const NOW = Date.parse('2026-11-06T12:00:00Z');
const ago = (min: number) => new Date(NOW - min * MIN).toISOString();

const order = (o: Partial<Order>): Order => ({
  id: '00000000-0000-0000-0000-000000000001',
  requesterId: 'r', courierId: 'c', requesterName: 'R', courierName: 'C',
  status: 'ASSIGNED', deliveredAt: null, cancelledAt: null,
  ...o,
});

test('no chat until a courier accepts', () => {
  assert.deepEqual(chatAccess(order({ courierId: null, status: 'UNASSIGNED' }), NOW), { canRead: false, canSend: false });
});

test('open while the errand is going', () => {
  assert.deepEqual(chatAccess(order({ status: 'PICKED_UP' }), NOW), { canRead: true, canSend: true });
});

test('can still send for 10 min after it ends, then read-only, then gone after 1 h', () => {
  assert.deepEqual(chatAccess(order({ status: 'DELIVERED', deliveredAt: ago(9) }), NOW), { canRead: true, canSend: true });
  assert.deepEqual(chatAccess(order({ status: 'DELIVERED', deliveredAt: ago(11) }), NOW), { canRead: true, canSend: false });
  assert.deepEqual(chatAccess(order({ status: 'CANCELLED', cancelledAt: ago(61) }), NOW), { canRead: false, canSend: false });
});