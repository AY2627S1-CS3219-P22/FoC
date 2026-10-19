# Credit Service demo runbook (D3)

A live demo of the Credit Service guarantees in D3 Part 2. Each scenario in
[`examples/demo.mjs`](../examples/demo.mjs) creates fresh users and orders, prints
balances before and after, and runs in about a second. Scenarios can be rerun in any order.

## Before the presentation

From the repository root, with Docker Desktop running:

```bash
npm ci && npm run build
docker compose -f credit-service/compose.yaml up -d --wait db
npm run security:setup --workspace @foc/credit-grpc   # once; keeps existing tokens
npm run db:migrate --workspace @foc/credit-grpc
npm run dev --workspace @foc/credit-grpc               # terminal 1
```

In `credit-service/.env`, set `CREDIT_GRPC_ADDR=127.0.0.1:50054`. With `localhost`,
each run waits about 20 seconds before exiting. Do a full rehearsal with
`node credit-service/examples/demo.mjs all`.

To demo the containerised service instead (D3 Part 4), stop `npm run dev` and run:

```bash
npm run tls:setup --workspace @foc/credit-grpc
docker compose -f credit-service/compose.yaml --profile app up -d --build --wait
export CREDIT_GRPC_CA_PATH=credit-service/keys/server-cert.pem
```

## Running order (about 4 minutes)

Run each scenario with `node credit-service/examples/demo.mjs <scenario>`.

| # | Scenario | D3 question | What to point out |
| --- | --- | --- | --- |
| 1 | `allocation` | 2: initial allocation, repeated requests | Five simultaneous `InitCredits` calls for one user yield 10 credits and **one** `INITIAL_GRANT` ledger row. The user ID is the retry identity, and the account insert, ledger entry and retry record commit together. |
| 2 | `reserve` | 3: sufficient balance, no reuse of held credits | Total stays 10 while 4 are held; available drops to 6. A 7-credit request is rejected. Five concurrent 3-credit requests yield exactly 3 successes: the account row is locked while availability is checked. |
| 3 | `complete` | 3: transfer, before/after balances; completion submitted twice | The requester loses 4 total and the courier gains 4; the combined total is unchanged. A repeated completion returns the original result without a second transfer. The ledger shows signed deltas. |
| 4 | `cancel` | 3: release on cancellation/expiry | The hold returns to available; the total never changes. A repeated cancellation is harmless, and completing a cancelled order is rejected. |
| 5 | `race` | Order 4: cancellation and completion at the same time | Exactly one terminal transition wins, and credits are conserved. |
| 6 | `failure` | 4: credits reserved but order creation fails; lost responses | Retrying the identical request returns the same reservation (no double hold). Order Service reconciles with `GetReservation` and compensates with `ReleaseCredits`. |
| 7 | `access` | 4: which services may invoke each operation | No credential returns `16`; out-of-scope callers return `7`; invalid input returns `3`. |
| – | `update` | Optional: reward edits | One atomic amount change with version protection, not release + reserve. A stale edit is rejected. |

To run the same checks from Postman, see [the Postman workspace](../postman/README.md).

Optional extras if time allows:
- Automatic client retries: Test 9 in the PR's acceptance criteria. Stop the service,
  start a call, and restart the service; the call succeeds once the service is back.
- Show the ledger is append-only: `docker compose -f credit-service/compose.yaml exec db
  psql -U credit -c "UPDATE credit.history SET total_delta = 99"` fails with
  `credit history is append-only`.

## Likely "why" questions

**Why PostgreSQL (SQL)?** A reservation must change the account balance, the
reservation, the ledger, and the retry record together or not at all. PostgreSQL
supports this in one transaction, plus:
- row locks (`SELECT … FOR UPDATE`) for concurrent spending;
- `CHECK` constraints (non-negative balances, `reserved ≤ total`) as a last line of defence;
- an append-only ledger with an ordered sequence for history pagination.

Credit queries are per-user and per-order lookups, which suit relational keys.

**How are reserved and total stored?** `accounts` stores `total_credits` and
`reserved_credits`. Available is always derived as `total − reserved`, never stored,
so the three cannot drift apart. Every change also writes a `history` row with signed
`total_delta`/`reserved_delta`.

**Initial allocation?** 10 credits, defined as `STARTER_CREDITS` in
`src/domain/models.ts` and granted only when an account is created. Returning users'
restored balances will replace the grant rather than add to it (archive/restore is
deferred until User Service supports it).

**Registration succeeds but credit allocation fails?** `InitCredits` is safe to
repeat: the user ID is its retry identity, so User Service can retry until it
succeeds without granting twice. The client already retries brief outages.
User Service still needs a durable pending-work record (for example an outbox row
written with the user) so the call survives a crash. That integration (task 12) is
not built yet; see the gaps below.

**How do retries avoid double effects?** Credit Service derives each operation's
identity (user ID; order ID; order ID + expected version for updates) and stores the
successful response in the same transaction. A repeat returns that response. A
repeat with different parameters is rejected.

**Order completed but transfer temporarily unavailable?** The client retries
`UNAVAILABLE`/`ABORTED` automatically with backoff. If the failure lasts longer, Order
Service keeps the settlement pending and retries the identical `SettleCredits` later;
replay makes that safe. `GetReservation` shows whether it has already happened.

**Why does `SettleCredits` take `courierId`?** Credit Service does not read Order data.
Order Service decides who the courier is and passes that fact. The courier ID is part
of the retry identity check, so a retry to a different courier is rejected.

**How are incomplete cross-service operations detected?** Order Service records each
pending credit operation before calling Credit and clears it on a confirmed result. A
recovery job retries or compensates the leftovers, using `GetReservation` to check the
current state. Credit provides the safe-to-retry operations and the read; the pending
records belong to Order Service.

## Gaps to close before D3

D3 asks for these and they are not demonstrable from Credit alone:
- **Registration-to-allocation flow (Part 2.2):** User Service must call `InitCredits`
  after registration, with durable retry. Until then, `allocation` shows the call User
  Service will make.
- **Order ↔ Credit integration (Parts 1.5, 2.4):** order create/cancel/complete must
  call reserve/release/settle. The `failure` and `race` scenarios show the Credit side.
- **Asynchronous workflow (Part 3):** registration → credit allocation is a natural
  candidate. User Service publishes a "user registered" event through an outbox; a
  consumer calls `InitCredits`, whose replay already deduplicates repeated messages.
- **Containerisation of all services (Part 4):** Credit's stack exists; the services
  still need a shared Compose network to run together.
