// AI Assistance Disclosure:
// Tool: OpenAI Codex (model: GPT-6), date: 2026-10-22 (Asia/Singapore).
// Scope: Tested timestamp-removal upgrade preservation and credit operations on the resulting schema.
// Author review: Pending human review.
// Prompts/key responses: ../ai/usage-log.md, entry 040.
// AI-generated; human review pending.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFile, readdir } = require('node:fs/promises');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client, Pool } = require('pg');
require('tsx/cjs');
const { CreditService } = require('../src/services/CreditService.ts');
const { SqlCreditRepository } = require('../src/repos/SqlCreditRepository.ts');
const { assertLedgerInvariants } = require('./helpers/ledger-invariants.cjs');

test('account and reservation timestamp removal preserves data and credit operations', {
  skip: !process.env.PGDATABASE && 'Set PGDATABASE and PG connection variables for timestamp migration checks.',
}, async (t) => {
  t.mock.method(console, 'info', () => {});
  const schema = 'timestamp_removal_' + randomUUID().replaceAll('-', '');
  const client = new Client({ connectionTimeoutMillis: 5000 });
  const pool = new Pool({ max: 2, connectionTimeoutMillis: 5000, options: '-c search_path=' + schema });
  const service = new CreditService(pool);
  const migration = '009_remove_account_reservation_timestamps.sql';
  const directory = join(__dirname, '../migrations');
  const users = ['requester', 'courier'];
  const orders = Array.from({ length: 3 }, () => randomUUID());
  let connected = false;
  const apply = async name => {
    await client.query('BEGIN');
    try { await client.query(await readFile(join(directory, name), 'utf8')); await client.query('COMMIT'); }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  };
  const snapshot = async () => {
    const result = {};
    for (const table of ['credit_accounts', 'reservations', 'credit_history', 'idempotency_records']) {
      const value = ['credit_accounts', 'reservations'].includes(table)
        ? "to_jsonb(row) - 'created_at' - 'updated_at'" : 'to_jsonb(row)';
      result[table] = (await client.query(`SELECT ${value} AS data FROM ${table} AS row ORDER BY (${value})::text`)).rows;
    }
    return result;
  };
  const verifyLedger = async () => {
    const reservationIds = (await client.query('SELECT reservation_id FROM reservations WHERE order_id = ANY($1::uuid[])', [orders]))
      .rows.map(row => row.reservation_id);
    await assertLedgerInvariants(client, { userIds: users, reservationIds }, 'timestamp-removal upgrade');
  };

  try {
    await client.connect(); connected = true;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name) && name < migration).sort()) await apply(name);
    for (const userId of users) await service.initCredits({ userId });
    for (const [i, amount] of [3, 2, 1].entries()) {
      await service.reserveCredits({ orderId: orders[i], requesterId: users[0], amount });
    }
    await verifyLedger();

    await t.test('upgrade drops only the four requested columns and preserves all other row data', async () => {
      for (const table of ['credit_accounts', 'reservations']) {
        const row = (await client.query(`SELECT created_at, updated_at FROM ${table} LIMIT 1`)).rows[0];
        assert.ok(row.created_at instanceof Date);
        assert.ok(row.updated_at instanceof Date);
      }
      const before = await snapshot();
      await apply(migration);
      const columns = (await client.query(
        "SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_schema = $1 AND column_name IN ('created_at','updated_at') ORDER BY table_name, column_name",
        [schema],
      )).rows;
      assert.deepEqual(columns, [
        { table_name: 'credit_history', column_name: 'created_at', udt_name: 'timestamptz' },
        { table_name: 'idempotency_records', column_name: 'created_at', udt_name: 'timestamptz' },
      ]);
      assert.deepEqual(await snapshot(), before);
    });

    // A genuine ledger failure stops this scenario before further operations.
    await verifyLedger();
    await t.test('reads, allocation, update, release, settlement and saved replay work without timestamps', async () => {
      const account = await new SqlCreditRepository(client).findAccount(users[0]);
      assert.deepEqual(account, { userId: users[0], totalCredits: 10, reservedCredits: 6 });
      const updated = await service.updateReservation({ orderId: orders[0], amount: 4, expectedVersion: 1 });
      assert.equal(updated.version, 2);
      assert.equal((await service.releaseCredits({ orderId: orders[1] })).status, 'RELEASED');
      assert.equal((await service.settleCredits({ orderId: orders[2], courierId: users[1] })).status, 'SETTLED');
      users.push('new-after-upgrade');
      await service.initCredits({ userId: users[2] });
      orders.push(randomUUID());
      await service.reserveCredits({ orderId: orders[3], requesterId: users[2], amount: 2 });
      const beforeReplay = await snapshot();
      assert.deepEqual(await service.updateReservation({ orderId: orders[0], amount: 4, expectedVersion: 1 }), updated);
      assert.deepEqual(await snapshot(), beforeReplay);
      assert.deepEqual(await service.getReservation({ orderId: orders[0] }), updated);
      assert.deepEqual(await service.getBalance({ userId: users[0] }), {
        userId: users[0], totalCredits: 9, reservedCredits: 4, availableCredits: 5,
      });
      const history = await service.getUserCreditHistory({ userId: users[0] });
      assert.ok(history.entries.length > 0);
      assert.ok(history.entries.every(entry => entry.createdAt instanceof Date));
    });
    await verifyLedger();
  } finally {
    await pool.end();
    try { if (connected) await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
    finally { await client.end(); }
  }
});
