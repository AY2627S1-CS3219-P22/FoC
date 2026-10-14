const assert = require('node:assert/strict');
const { test } = require('node:test');
const { CreditService } = require('../dist/services/credit-service');
const { CreditAccount } = require('../dist/domain/models');
const { balance } = require('../dist/domain/views');

test('invalid requests fail before accessing the database', async () => {
  const service = new CreditService({ transaction() { throw new Error('Unexpected database access'); } });
  const cases = [
    () => service.initCredits({ userId: '' }),
    () => service.displayCredit({ userId: ' user' }),
    () => service.createReservation({ orderId: 'o', requesterId: 'u', amount: 0 }),
    () => service.createReservation({ orderId: 'o', requesterId: 'u', amount: 1.5 }),
    () => service.createReservation({ orderId: 'o', requesterId: 'u', amount: 2147483648 }),
    () => service.updateReservation({ orderId: 'o', amount: 2, expectedVersion: 1 }),
    () => service.updateReservation({ orderId: 'o', amount: 2, expectedVersion: 0, idempotencyKey: 'edit' }),
    () => service.displayUserHistory({ userId: 'u', pageSize: 101 }),
    () => service.displayUserHistory({ userId: 'u', pageToken: 'invalid' }),
    () => service.displayUserHistory({ userId: 'u', pageToken: Buffer.from(JSON.stringify({ userId: 'other', sequenceId: '1' })).toString('base64url') }),
  ];
  for (const invoke of cases) await assert.rejects(invoke(), error => error.code === 'INVALID_ARGUMENT');
});

test('available balance excludes reserved credits', () => {
  assert.deepEqual(balance(new CreditAccount('u', 10, 4)),
    { userId: 'u', totalCredits: 10, reservedCredits: 4, availableCredits: 6 });
});

test('initialising or loading an account never permits a second starter grant', () => {
  const account = new CreditAccount('u');
  account.initAccount();
  account.reservedCreditAmount = 4;
  assert.throws(() => account.initAccount(), error => error.code === 'FAILED_PRECONDITION');
  assert.equal(account.getAvailableBalance(), 6);
  const spentAccount = new CreditAccount('spent', 0, 0);
  assert.throws(() => spentAccount.initAccount(), error => error.code === 'FAILED_PRECONDITION');
});
