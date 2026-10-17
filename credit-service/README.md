# Credit Service

TypeScript/Node.js service with PostgreSQL persistence and an internal gRPC API on
port **50054**. This first implementation covers accounts, reservations, transfers,
history, and idempotency. Credit Service owns these records; other services access
them through gRPC rather than editing its database.

The team's [class diagram reference](docs/class-diagram.md) defines the internal
classes and remaining features. The implemented flow is gRPC → `CreditController`
→ `CreditService` → `CreditRepository` / `SqlCreditRepository`. Domain classes use
the diagram's names; adapters retain existing API/database names such as `orderId`
and `SETTLED`. The reference documents these mappings and the features still pending.

The runnable package lives in `credit-service/`, with implementation in `src/`.
The `src/grpc/` folder contains its gRPC transport. Credit Service makes no outbound gRPC calls.

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
host. To run the service itself in a container, see [Run in containers](#run-in-containers).
Migrations are explicit, transactional,
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

See [the schema reference](db/README.md) for tables, relationships, and constraints.

Stop the development database without deleting its data:

```bash
docker compose -f credit-service/compose.yaml stop db
```

## Run in containers

The Compose `app` profile builds the service image, applies migrations in a one-off
container, and then starts the gRPC server. From the **repository root**, with Docker
Desktop running:

```bash
cp credit-service/.env.example credit-service/.env   # only if you have no .env yet
npm run security:setup --workspace @foc/credit-grpc
npm run tls:setup --workspace @foc/credit-grpc
docker compose -f credit-service/compose.yaml --profile app up -d --build --wait
```

| Component | Host address | Container address |
| --- | --- | --- |
| Credit gRPC (TLS) | `127.0.0.1:50054` | `app:50054` |
| Development PostgreSQL | `127.0.0.1:54333` | `db:5432` |

The image uses Node.js 22, compiled JavaScript, production dependencies only, and the
unprivileged `node` user. Its build context is the repository root because the service
imports the shared `@foc/grpc` workspace; `Dockerfile.dockerignore` allowlists the build
inputs, and `.env` files and keys never enter the image. Configuration is supplied at
runtime:

- **Credentials:** Compose reads the scoped service tokens from `credit-service/.env`.
  The container refuses to start without at least one token.
- **TLS:** the container listens on `0.0.0.0` with `NODE_ENV=production`, so TLS is
  mandatory. `tls:setup` creates a local self-signed certificate (valid for
  `localhost`, `127.0.0.1`, and `credit-service`) in the git-ignored `credit-service/keys/`,
  mounted read-only into the container. Use CA-issued certificates in deployment.
  The key is owner-readable only; on a Linux host whose user ID is not 1000, make it
  readable by the container's `node` user (UID 1000).
- **User JWTs:** when `CREDIT_USER_JWT_PUBLIC_KEY_PATH` is set in `.env`, the container
  uses `user-service/keys/public.pem`, mounted read-only.

The health check reports ready only when the gRPC listener completes a TLS handshake
and the migrated database answers. It calls no RPC, so it needs no credential and
adds no access-audit entries. Run the demo against the container:

```bash
CREDIT_GRPC_CA_PATH=credit-service/keys/server-cert.pem node credit-service/examples/core-flow.mjs
```

Stop the host `npm run dev` process first; both bind `127.0.0.1:50054`. After adding a
migration, rebuild and rerun it before restarting:

```bash
docker compose -f credit-service/compose.yaml --profile app build
docker compose -f credit-service/compose.yaml --profile app run --rm migrate
docker compose -f credit-service/compose.yaml --profile app up -d --wait
```

Stop the stack while keeping the `credit-data` volume:
`docker compose -f credit-service/compose.yaml --profile app down`. This is a local
stack: ports bind to loopback, and other services join it on a shared network later.

## API and rules

The contract is [credit.proto](../shared/grpc/proto/credit.proto).
JavaScript clients use camelCase fields via `createCreditClient` from `@foc/grpc`.

| RPC | Caller responsibility | Behaviour |
| --- | --- | --- |
| `InitCredits` | User Service supplies the registered user's stable ID | Creates an account and grants 10 credits once; existing accounts receive no extra grant. |
| `GetBalance` | Caller supplies a user ID it is authorised to read | Returns total, reserved, and available credits (`total - reserved`). |
| `GetCreditHistory` | Same read authorisation | Returns newest-first history, default 50 entries, maximum 100, with a user-bound continuation token. |
| `ReserveCredits` | Order Service supplies a unique order ID, requester ID, and amount | Holds available credits; one reservation per order. |
| `UpdateReservation` | Order Service supplies the last reservation version | Changes an active reservation's amount, subject to available balance; that order/version identifies retries. |
| `ReleaseCredits` | Order Service confirms cancellation | Removes the hold without changing total credits. |
| `SettleCredits` | Order Service confirms completion and the courier ID | Atomically debits requester total/reserved credits and credits the courier total. |
| `GetReservation` | Order Service supplies the order ID | Returns the reservation's current status, amount, and version. Read-only; it records no retry result. |

Both participants must already have accounts. Credits are positive whole integers
within the protobuf `int32` range. The requester cannot also be the courier.
User and order identifiers are opaque strings; no cross-service database foreign
keys are created. Order Service must validate order ownership, completion, and the
assigned courier before requesting a mutation. User Service must validate registration
before initialisation. Those callers are **not yet wired into their lifecycle hooks**.

Reservations transition from `RESERVED` to either `RELEASED` or `SETTLED`.
Updates keep the reservation `RESERVED` and increment its version. An update to the
current amount is still an edit: it increments the version and records a zero-delta
history entry, so the next edit must use the returned version. Terminal
reservations cannot be reopened or updated. A duplicate create for the same order
and matching requester/amount returns the existing reservation, including its
terminal status, without creating another hold. Different details are rejected.

Each mutation commits the account changes, reservation, append-only history, and
idempotency result in **one PostgreSQL transaction**. Idempotency is a table in the
credit database, not a separate Redis/database write. Concurrent mutations serialize
by order; account rows are locked in a consistent order during transfers.

Retry rules:

- Callers do not supply idempotency keys. Credit Service derives an internal identity
  scoped by operation: user ID for init, order ID for reserve/release/settle, and the
  JSON-encoded `(orderId, expectedVersion)` pair for updates.
- `expectedVersion` is the credit reservation's returned `version`, separate from
  Order Service's own order version. Persist it after each confirmed mutation.
  Each new edit uses the last confirmed version; retries use the original version
  and amount. A new edit with a stale version is rejected.
- A successfully committed operation returns its **original response** on retry,
  even after later edits, release, or settlement. Saved results are checked before
  current-state/version checks. Use `GetReservation` for the current reservation
  state/version, or `GetBalance`/`GetCreditHistory` for account state; an old retry
  response must not overwrite a newer locally confirmed version.
- Different parameters for an already committed identity are rejected. For example,
  changing an update's amount while keeping its order/version is a conflict.
  Failed transactions leave no successful retry record. Records have no automatic
  expiry in this phase.
- Timeout/disconnection can occur after a commit. Retry the same request to resolve
  that uncertainty; do not advance `expectedVersion` just because the response was lost.
  If Order Service no longer has the original request (for example, after losing its
  pending-operation record), reconcile with `GetReservation` instead of guessing.
  A `FAILED_PRECONDITION` stale-version error means another edit committed first:
  reload with `GetReservation` before deciding whether to send a new edit.

Regenerate clients for the simplified request contracts. The retired protobuf key
fields are reserved, and existing stored retry records are retained. Earlier
caller-selected keys are not remapped to the new identities: an update previously
committed under a custom key can return a stale-version conflict through the new
contract. Reconcile outstanding requests from that earlier contract before switching
callers; do not resubmit an uncertain edit using a newer version.

| gRPC status | Meaning |
| --- | --- |
| `INVALID_ARGUMENT` (3) | Invalid identifier, amount, version, or pagination request |
| `NOT_FOUND` (5) | Account or reservation does not exist |
| `FAILED_PRECONDITION` (9) | Insufficient credits, invalid transition, stale version, or conflicting retry parameters |
| `ABORTED` (10) | Database lock/transaction interrupted; retry the same request |
| `UNAVAILABLE` (14) | Database connection unavailable; retry the same request |
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
no archive processing is implemented yet.

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
- Add authenticated balance/history access for frontend/admin users.
- Configure deployment credentials and transport: secret storage and CA-issued certificates.
