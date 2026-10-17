const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { before, after, test } = require('node:test');
const { Pool } = require('pg');
const { migrate } = require('../dist/database/migrate');

const url = process.env.CREDIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/credit_test') {
  throw new Error('CREDIT_TEST_DATABASE_URL must point to the dedicated credit_test database');
}
const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
before(() => migrate(pool));
after(() => pool.end());

async function transaction(action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await action(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

test('migrations replay without changing their recorded checksums', async () => {
  const query = 'SELECT name, checksum, applied_at FROM credit.schema_migrations ORDER BY name';
  const original = (await pool.query(query)).rows;
  assert.deepEqual(original.map(row => row.name), ['001_core.sql', '002_idempotency_user.sql']);
  await migrate(pool);
  assert.deepEqual((await pool.query(query)).rows, original);
});

test('new accounts default to ten total credits and zero reserved credits', () => transaction(async client => {
  const result = await client.query('INSERT INTO credit.accounts(user_id) VALUES ($1) RETURNING total_credits, reserved_credits', [randomUUID()]);
  assert.deepEqual(result.rows[0], { total_credits: 10, reserved_credits: 0 });
}));

test('accounts reject negative balances and holds above the total', async () => {
  for (const [total, reserved] of [[-1, 0], [10, -1], [10, 11]]) {
    await transaction(async client => {
      await assert.rejects(client.query('INSERT INTO credit.accounts(user_id, total_credits, reserved_credits) VALUES ($1, $2, $3)',
        [randomUUID(), total, reserved]), { code: '23514' });
    });
  }
});

test('one order cannot have two reservations', () => transaction(async client => {
  const requester = randomUUID();
  const order = randomUUID();
  await client.query('INSERT INTO credit.accounts(user_id) VALUES ($1)', [requester]);
  const query = "INSERT INTO credit.reservations(reservation_id, order_id, requester_id, amount, status) VALUES ($1, $2, $3, 4, 'RESERVED')";
  await client.query(query, [randomUUID(), order, requester]);
  await assert.rejects(client.query(query, [randomUUID(), order, requester]), { code: '23505' });
}));

test('settled reservations require a different courier with an account', async () => {
  for (const destination of ['missing', 'same', 'unknown']) {
    await transaction(async client => {
      const requester = randomUUID();
      await client.query('INSERT INTO credit.accounts(user_id) VALUES ($1)', [requester]);
      const courier = destination === 'missing' ? null : destination === 'same' ? requester : randomUUID();
      await assert.rejects(client.query(`INSERT INTO credit.reservations
        (reservation_id, order_id, requester_id, amount, status, courier_id) VALUES ($1, $2, $3, 4, 'SETTLED', $4)`,
      [randomUUID(), randomUUID(), requester, courier]), { code: destination === 'unknown' ? '23503' : '23514' });
    });
  }
});

test('history rows cannot be edited or deleted', async () => {
  for (const action of ['UPDATE credit.history SET total_delta = 99 WHERE id = $1', 'DELETE FROM credit.history WHERE id = $1']) {
    await transaction(async client => {
      const user = randomUUID();
      const entry = randomUUID();
      await client.query('INSERT INTO credit.accounts(user_id) VALUES ($1)', [user]);
      await client.query("INSERT INTO credit.history(id, user_id, type, total_delta, reserved_delta) VALUES ($1, $2, 'INITIAL_GRANT', 10, 0)", [entry, user]);
      await assert.rejects(client.query(action, [entry]), /credit history is append-only/);
    });
  }
});

test('retry records require an account identity', () => transaction(async client => {
  await assert.rejects(client.query(`INSERT INTO credit.idempotency_records
    (operation, key, request_hash, result) VALUES ('INIT', $1, $2, '{}')`,
  [randomUUID(), 'a'.repeat(64)]), { code: '23502' });
}));

test('retry records require a unique operation/key', () => transaction(async client => {
  const key = randomUUID();
  const query = 'INSERT INTO credit.idempotency_records(operation, key, user_id, request_hash, result) VALUES ($1, $2, $3, $4, $5)';
  const values = ['INIT', key, randomUUID(), 'a'.repeat(64), '{}'];
  await client.query(query, values);
  await assert.rejects(client.query(query, values), { code: '23505' });
}));
