# Credit Service

TypeScript/Node.js service with PostgreSQL persistence and an internal gRPC API on
port **50053**. This first implementation covers accounts, reservations, transfers,
history, and idempotency. Credit Service owns these records; other services access
them through gRPC rather than editing its database.

The team's [class diagram reference](docs/class-diagram.md) defines the internal
classes and remaining features. The implemented flow is gRPC → `CreditController`
→ `CreditService` → `CreditRepository` / `SqlCreditRepository`. Domain classes use
the diagram's names; adapters retain existing API/database names such as `orderId`
and `SETTLED`. The reference documents these mappings and the features still pending.

The runnable package lives in `credit-service/`, with implementation in `src/`.
The `src/grpc/` folder contains its gRPC transport and peer-client wiring.

[FR/NFR requirements and integration responsibilities](docs/requirements.md) map
the team's specifications to implemented features, remaining work, and policy decisions.

## Local setup

Use Node.js 22 and start Docker Desktop. From the **repository root**:

```bash
npm ci
npm run build
docker compose -f credit-service/compose.yaml up -d --wait db
cp credit-service/.env.example credit-service/.env
npm run security:setup --workspace @foc/credit-grpc
npm run db:migrate --workspace @foc/credit-grpc
npm run dev --workspace @foc/credit-grpc
```

Only copy `.env.example` if you do not already have a credit `.env` file.
The database uses `127.0.0.1:54333`, separate from the user and supplier databases.
Compose starts a small `postgres:17-alpine` database; the Node process runs on your
host. App containerisation is a separate task. Migrations are explicit, transactional,
and tracked with checksums. Create a new migration when changing an applied schema.
No seed data is needed: use `InitCredits` to create each account.

In another terminal, from the repository root:

```bash
node credit-service/examples/core-flow.mjs
```

This creates two demo accounts, reserves 4 credits, updates the reservation to 3,
and transfers those 3 to the courier. Final total balances are 7 and 13.
Each run uses new identifiers. The local demo reads scoped credentials from
`credit-service/.env`; history access is tested separately with a User Service JWT.

Stop the development database without deleting its data:

```bash
docker compose -f credit-service/compose.yaml stop db
```

## API and rules

The contract is [credit.proto](../shared/grpc/proto/credit.proto).
JavaScript clients use camelCase fields via `createCreditClient` from `@foc/grpc`.

| RPC | Caller responsibility | Behaviour |
| --- | --- | --- |
| `InitCredits` | User Service supplies the registered user's stable ID | Creates an account and grants 10 credits once; existing accounts receive no extra grant. |
| `GetBalance` | Caller supplies a user ID it is authorised to read | Returns total, reserved, and available credits (`total - reserved`). |
| `GetCreditHistory` | Same read authorisation | Returns newest-first history, default 50 entries, maximum 100, with a user-bound continuation token. |
| `ReserveCredits` | Order Service supplies a unique order ID, requester ID, and amount | Holds available credits; one reservation per order. |
| `UpdateReservation` | Order Service supplies the last reservation version and a new retry key | Changes an active reservation's amount, subject to available balance. |
| `ReleaseCredits` | Order Service confirms cancellation | Removes the hold without changing total credits. |
| `SettleCredits` | Order Service confirms completion and the courier ID | Atomically debits requester total/reserved credits and credits the courier total. |

Both participants must already have accounts. Credits are positive whole integers
within the protobuf `int32` range. The requester cannot also be the courier.
User and order identifiers are opaque strings; no cross-service database foreign
keys are created. Order Service must validate order ownership, completion, and the
assigned courier before requesting a mutation. User Service must validate registration
before initialisation. Those callers are **not yet wired into their lifecycle hooks**.

Reservations transition from `RESERVED` to either `RELEASED` or `SETTLED`.
Updates keep the reservation `RESERVED` and increment its version. Terminal
reservations cannot be reopened or updated. A duplicate create for the same order
and matching requester/amount returns the existing reservation, including its
terminal status, without creating another hold. Different details are rejected.

Each mutation commits the account changes, reservation, append-only history, and
idempotency result in **one PostgreSQL transaction**. Idempotency is a table in the
credit database, not a separate Redis/database write. Concurrent mutations serialize
by order; account rows are locked in a consistent order during transfers.

Retry rules:

- Reuse the same `idempotencyKey` for retries of the same request. Keys are scoped
  by operation; use globally unique keys across callers within each operation.
- `InitCredits` defaults to the user ID; reserve/release/settle default to the order ID.
- Updates require an explicit key and `expectedVersion`. Each intentional update
  needs a new key. A stale version is rejected.
- A successfully committed key returns its **original response** on retry, even
  after later changes. Use `GetBalance`/`GetCreditHistory` for current state.
- Reusing a committed key with different parameters is rejected. Failed transactions
  leave no successful retry record. Records have no automatic expiry in this phase.
- Timeout/disconnection can occur after a commit. Retry the same request/key to
  resolve that uncertainty; do not issue a different key just because the response was lost.

| gRPC status | Meaning |
| --- | --- |
| `INVALID_ARGUMENT` (3) | Invalid identifier, amount, version, or pagination request |
| `NOT_FOUND` (5) | Account or reservation does not exist |
| `FAILED_PRECONDITION` (9) | Insufficient credits, invalid transition, stale version, or conflicting retry key |
| `ABORTED` (10) | Database lock/transaction interrupted; retry the same request/key |
| `UNAVAILABLE` (14) | Database connection unavailable; retry the same request/key |
| `PERMISSION_DENIED` (7) | Service scope, user ownership, or administrator role does not permit this operation |
| `UNAUTHENTICATED` (16) | Missing/incorrect service credential or invalid/missing required user JWT |

Every RPC requires `x-credit-service-token` metadata, including localhost calls.
Use distinct secrets of at least 32 characters; each caller receives only its own
credential. There is no shared all-purpose credential or unauthenticated fallback.
The previous `CREDIT_SERVICE_TOKEN` setting is no longer accepted.

| Caller / credential setting | Allowed operations |
| --- | --- |
| User Service / `CREDIT_USER_SERVICE_TOKEN` | Initialisation; own-user balance/history reads with a user JWT |
| Order Service / `CREDIT_ORDER_SERVICE_TOKEN` | Reserve, update, release, settle; trusted balance prechecks |
| Frontend backend adapter / `CREDIT_FRONTEND_SERVICE_TOKEN` | Own-user balance/history reads with a user JWT |
| Admin backend / `CREDIT_ADMIN_SERVICE_TOKEN` | Balance/history reads with an Administrator user JWT |

For user/admin reads, forward `authorization: Bearer <user JWT>` metadata and configure
`CREDIT_USER_JWT_PUBLIC_KEY_PATH` with the existing User Service public key.
Verification requires RS256, a valid expiration, a user subject, and the existing
`USER` / `ADMINISTRATOR` role array. Ordinary reads must match that subject, even if
the user also holds an administrator role. Cross-user reads require the Admin Service
credential plus `ADMINISTRATOR`. Configure issuer/audience checks when User Service
issues those claims; its current tokens do not include them. Frontend/admin credentials
cannot be configured without the verification key. Keep these credentials in backend
configuration, never in browser bundles.

Access decisions produce structured `credit_access` logs containing the RPC, caller,
actor/target identifiers, timestamp, decision and status code. Tokens and request
bodies are omitted. Deployment still needs protected log collection/retention and
database-at-rest encryption. Archive email encryption will accompany archive storage;
no archive or dispute processing is implemented yet.

Local development defaults to `127.0.0.1` with insecure transport. TLS is required
for a non-loopback binding or `NODE_ENV=production`: configure both
`CREDIT_TLS_CERT_PATH` and `CREDIT_TLS_KEY_PATH`. Clients pass
`credentials.createSsl(trustedCaCertificate)` through the shared client's `credentials`
option. Configure trusted certificates for deployment; do not disable verification.
The scoped service credentials remain required over TLS.

## Tests

From the repository root after installing dependencies:

```bash
npm run build
npm test
npm run test --workspace @foc/credit-grpc
npm run test --workspace @foc/order-grpc
docker compose -f credit-service/compose.yaml --profile test up -d --wait test-db
CREDIT_TEST_DATABASE_URL=postgresql://credit:credit@127.0.0.1:54334/credit_test npm run test:integration --workspace @foc/credit-grpc
docker compose -f credit-service/compose.yaml --profile test rm -s -f test-db
```

Integration tests require a dedicated database named `credit_test`; they add unique
test records and refuse to run against the development database. The test container
stores its data in memory, so removing it clears only test data. Tests cover real
gRPC requests, duplicate/reordered retries, concurrent overspending, opposing
transfers, release/settlement races, append-only history, transaction rollback,
service permissions, JWT ownership/admin checks, and TLS. Order race-policy tests
exercise every ordering of competing intents. OpenSSL is required for the TLS test.

## Follow-up tasks

- Connect successful registration and order lifecycle changes to these RPCs with
  durable retry/reconciliation handling across services.
- Deferred until User Service is ready: archived-user storage and account archive/restore, including retention, active-reservation and identity rules.
- Define and implement dispute adjustments with admin authorisation and audit reasons.
- Add authenticated balance/history access for frontend/admin users.
- Containerise the application and configure deployment credentials/transport.
