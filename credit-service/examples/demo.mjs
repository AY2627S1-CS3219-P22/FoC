// Presentation demo: each scenario shows one Credit Service guarantee with before/after balances.
// Usage (repository root, service running): node credit-service/examples/demo.mjs <scenario|all>
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { credentials, Metadata } from '@grpc/grpc-js';
import { createCreditClient } from '@foc/grpc';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
if (!process.env.CREDIT_USER_SERVICE_TOKEN || !process.env.CREDIT_ORDER_SERVICE_TOKEN) {
  throw new Error('Run npm run security:setup --workspace @foc/credit-grpc before the demo');
}
const caPath = process.env.CREDIT_GRPC_CA_PATH;
const credit = createCreditClient(process.env.CREDIT_GRPC_ADDR ?? '127.0.0.1:50054',
  caPath ? { credentials: credentials.createSsl(readFileSync(caPath)) } : {});
// Read-only view of the ledger, to show what the database recorded.
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function as(token) {
  const metadata = new Metadata();
  metadata.set('x-credit-service-token', token);
  return { metadata };
}
const userService = as(process.env.CREDIT_USER_SERVICE_TOKEN);
const orderService = as(process.env.CREDIT_ORDER_SERVICE_TOKEN);

const step = text => console.log(`\n▶ ${text}`);
const ok = text => console.log(`  ✔ ${text}`);
const short = id => id.slice(0, 8);
async function balances(title, users) {
  const rows = {};
  for (const [name, userId] of Object.entries(users)) {
    const { totalCredits, reservedCredits, availableCredits } = await credit.getBalance({ userId }, orderService);
    rows[name] = { total: totalCredits, reserved: reservedCredits, available: availableCredits };
  }
  console.log(`  ${title}`);
  console.table(rows);
}
async function rejected(label, call) {
  try {
    await call();
    console.log(`  ✘ ${label}: unexpectedly succeeded`);
  } catch (error) {
    console.log(`  ✔ ${label}: rejected with code ${error.code} (${error.details})`);
  }
}
async function ledger(userId) {
  const { rows } = await db.query(`SELECT type, total_delta, reserved_delta, left(coalesce(order_id, ''), 8) AS "order"
    FROM credit.history WHERE user_id = $1 ORDER BY sequence_id`, [userId]);
  console.log(`  Ledger (credit.history) for user ${short(userId)}:`);
  console.table(rows);
}
async function newUser() {
  const userId = randomUUID();
  await credit.initCredits({ userId }, userService);
  return userId;
}

const scenarios = {
  async allocation() {
    step('User Service calls InitCredits after registration; the same request arrives 5 times at once');
    const userId = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => credit.initCredits({ userId }, userService)));
    ok(`all 5 responses report ${[...new Set(results.map(r => r.totalCredits))].join(', ')} credits`);
    await balances('Balance after 5 concurrent registrations:', { newUser: userId });
    await ledger(userId);
    ok('exactly one INITIAL_GRANT: repeated requests never grant twice');
  },

  async reserve() {
    step('Requester posts an errand with a 4-credit reward');
    const requester = await newUser();
    await balances('Before:', { requester });
    const reservation = await credit.reserveCredits({ orderId: randomUUID(), requesterId: requester, amount: 4 }, orderService);
    ok(`reservation ${short(reservation.reservationId)} is ${reservation.status}, version ${reservation.version}`);
    await balances('After (total unchanged; 4 held, so only 6 are available):', { requester });
    step('A second errand asks for 7 credits; only 6 are available');
    await rejected('reserve 7 more', () => credit.reserveCredits({ orderId: randomUUID(), requesterId: requester, amount: 7 }, orderService));
    step('Another requester posts five 3-credit errands at the same moment (15 credits wanted, 10 owned)');
    const busy = await newUser();
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, () =>
      credit.reserveCredits({ orderId: randomUUID(), requesterId: busy, amount: 3 }, orderService)));
    const won = attempts.filter(a => a.status === 'fulfilled').length;
    ok(`${won} reservations succeeded, ${attempts.length - won} rejected: held credits cannot be reused`);
    await balances('After the concurrent burst:', { busyRequester: busy });
  },

  async update() {
    step('Requester raises the reward from 4 to 6 credits');
    const requester = await newUser(); const orderId = randomUUID();
    const reservation = await credit.reserveCredits({ orderId, requesterId: requester, amount: 4 }, orderService);
    const updated = await credit.updateReservation({ orderId, amount: 6, expectedVersion: reservation.version }, orderService);
    ok(`amount ${reservation.amount} → ${updated.amount}; version ${reservation.version} → ${updated.version} (one atomic change, not release + reserve)`);
    await balances('After the update:', { requester });
    step('A second edit was based on the old version 1');
    await rejected('stale edit to 2 credits', () => credit.updateReservation({ orderId, amount: 2, expectedVersion: reservation.version }, orderService));
    const current = await credit.getReservation({ orderId }, orderService);
    ok(`GetReservation shows the current state: ${current.amount} credits, version ${current.version}`);
  },

  async complete() {
    step('Errand completed: Order Service settles the reservation to the assigned courier');
    const requester = await newUser(); const courier = await newUser(); const orderId = randomUUID();
    await credit.reserveCredits({ orderId, requesterId: requester, amount: 4 }, orderService);
    await balances('Before completion:', { requester, courier });
    const settled = await credit.settleCredits({ orderId, courierId: courier }, orderService);
    ok(`reservation ${settled.status} to courier ${short(settled.courierId)}`);
    await balances('After completion (requester -4 total, courier +4; combined credits unchanged):', { requester, courier });
    step('The completion request is submitted twice');
    const again = await credit.settleCredits({ orderId, courierId: courier }, orderService);
    ok(`second request returns the original result (version ${again.version}); no second transfer`);
    await balances('Balances are unchanged:', { requester, courier });
    await rejected('release after completion', () => credit.releaseCredits({ orderId }, orderService));
    await ledger(requester);
  },

  async cancel() {
    step('Errand cancelled (or expired) before acceptance: Order Service releases the hold');
    const requester = await newUser(); const orderId = randomUUID();
    await credit.reserveCredits({ orderId, requesterId: requester, amount: 4 }, orderService);
    await balances('Before cancellation:', { requester });
    const released = await credit.releaseCredits({ orderId }, orderService);
    ok(`reservation ${released.status}`);
    await balances('After cancellation (credits available again; total never changed):', { requester });
    await credit.releaseCredits({ orderId }, orderService);
    ok('a repeated cancellation returns the same result and releases nothing extra');
    await rejected('complete after cancellation', () => credit.settleCredits({ orderId, courierId: randomUUID() }, orderService));
  },

  async race() {
    step('Cancellation and completion for the same errand arrive at the same time');
    const requester = await newUser(); const courier = await newUser(); const orderId = randomUUID();
    await credit.reserveCredits({ orderId, requesterId: requester, amount: 4 }, orderService);
    const [release, settle] = await Promise.allSettled([
      credit.releaseCredits({ orderId }, orderService),
      credit.settleCredits({ orderId, courierId: courier }, orderService),
    ]);
    const winner = release.status === 'fulfilled' ? 'release' : 'settle';
    const loser = winner === 'release' ? settle : release;
    ok(`exactly one wins: ${winner}; the other is rejected with code ${loser.reason?.code}`);
    await balances('Final balances (combined total is still 20):', { requester, courier });
  },

  async failure() {
    step('Credits reserved, then order creation fails inside Order Service');
    const requester = await newUser(); const orderId = randomUUID();
    const request = { orderId, requesterId: requester, amount: 4 };
    const reservation = await credit.reserveCredits(request, orderService);
    await balances('Hold exists but no order was published:', { requester });
    step('Order Service never received the response (timeout) and retries the identical request');
    const retry = await credit.reserveCredits(request, orderService);
    ok(`same reservation ${short(retry.reservationId)} returned (original was ${short(reservation.reservationId)}); nothing held twice`);
    step('On recovery Order Service checks the reservation, sees no order, and compensates');
    const found = await credit.getReservation({ orderId }, orderService);
    ok(`GetReservation: ${found.status}, ${found.amount} credits`);
    await credit.releaseCredits({ orderId }, orderService);
    await balances('After compensation (back to the starting state):', { requester });
  },

  async access() {
    step('Every caller needs its own credential, scoped to what it may do');
    const userId = await newUser();
    await rejected('no credential', () => credit.getBalance({ userId }));
    await rejected('User Service tries to reserve', () =>
      credit.reserveCredits({ orderId: randomUUID(), requesterId: userId, amount: 1 }, userService));
    await rejected('Order Service tries to create an account', () => credit.initCredits({ userId: randomUUID() }, orderService));
    await rejected('Order Service tries to read history', () => credit.getCreditHistory({ userId }, orderService));
    await rejected('zero-credit reward', () => credit.reserveCredits({ orderId: randomUUID(), requesterId: userId, amount: 0 }, orderService));
  },
};

const requested = process.argv[2];
const names = requested === 'all' ? Object.keys(scenarios) : [requested];
if (!requested || names.some(name => !scenarios[name])) {
  console.log(`Usage: node credit-service/examples/demo.mjs <${Object.keys(scenarios).join('|')}|all>`);
  process.exitCode = 1;
} else {
  try {
    for (const name of names) {
      console.log(`\n━━━ ${name} ━━━`);
      await scenarios[name]();
    }
  } finally {
    credit.close();
    await db.end();
  }
}
