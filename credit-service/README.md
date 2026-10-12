# Credit Service

TypeScript/Node.js core with PostgreSQL persistence. The flow is gRPC →
`CreditController` → `CreditService` → `CreditRepository` / `SqlCreditRepository`.

## Core behaviour

New accounts receive 10 credits once. Reservations hold available credits without
reducing the total. Updating a reservation atomically changes its held amount;
release removes that hold. Settlement atomically subtracts the hold from the
requester total and adds it to the courier total. Both accounts must exist and
must be different users. Balance queries return total, reserved and available.
History is append-only and paginated, newest-first, with a maximum page size of 100.

Domain names follow the class diagram: `errandID`, `userID`, `TRANSFERRED` and
`RESERVE`/`UPDATE`/`RELEASE`/`TRANSFER`. Existing gRPC/database names remain
`orderId`, `requesterId`, `SETTLED`, and the existing history type names.

## Local setup

From the repository root with Node.js 22 and Docker running:

```bash
npm ci
npm run build
docker compose -f credit-service/compose.yaml up -d --wait db
cp credit-service/grpc/.env.example credit-service/grpc/.env
```

Set a randomly generated `CREDIT_SERVICE_TOKEN` of at least 32 characters in
`grpc/.env`, then run:

```bash
npm run db:migrate --workspace @foc/credit-grpc
npm run dev --workspace @foc/credit-grpc
```

The local listener binds to loopback on port 50053 and requires that token in
`x-credit-service-token` metadata. The database uses port 54333. The application
runs on the host; the database runs in Compose. From another terminal, run
`node credit-service/examples/core-flow.mjs` to initialise demo users and transfer
three credits, resulting in balances of 7 and 13.

## Verification

```bash
npm run build
npm test
npm run test --workspace @foc/credit-grpc
docker compose -f credit-service/compose.yaml --profile test up -d --wait test-db
CREDIT_TEST_DATABASE_URL=postgresql://credit:credit@127.0.0.1:54334/credit_test npm run test:integration --workspace @foc/credit-grpc
```

Integration tests require the dedicated `credit_test` database. Migrations are
transactional, checksum-tracked and repeatable. The initial schema also establishes
retry storage/version fields for the following hardening commit; this core commit
contains the business operations, with request replay/locking added next.

Archive/restore and User/Order/frontend integration remain to implement.
Disputes are deferred until last.

## Idempotency and concurrency

Every mutation saves its successful response with its operation/key and a hash of
its parameters in the same transaction as accounts, reservation and history.
Retries replay that response; conflicting parameters under the same key are rejected.
Initialisation defaults to user ID, and reserve/release/settle default to order ID.
Updates require an explicit key and the current reservation version.

Transaction-scoped advisory locks serialize retry keys and orders. Account row
locks prevent overspending; transfers acquire participant locks in stable order.
A failed transaction leaves no successful retry record. Reservation version checks
prevent stale updates. Caller retry handling should reuse the original key/parameters.

The Order race-policy component and its integration instructions are in
`order-service/docs/race-policy.md`. It selects priority among a pending cohort;
its persistent queue and order lifecycle integration remain with the Order owner.
