<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
Scope: Updated Credit plaintext setup documentation. Author review pending; see usage-log.md. -->

# Order Service - Friend on Campus

Phase 2 implements core creation, acceptance, pickup, delivery, cancellation,
expiry and credit-retry orchestration on top of Phase 1 persistence/authentication.
External services use injected interfaces. Credit now has an opt-in RPC adapter;
User/Supplier adapters remain pending.

**Testing versus production:** integration tests inject test-only User/Supplier/
Credit implementations and exercise the full workflow against real PostgreSQL.
Normal `npm run dev`, `npm start`, and Docker startup do not inject those fakes.
With Credit disabled, creation, delivery and cancellation return **503**.
With Credit configured, delivery/cancellation invoke it; creation still needs
User/Supplier adapters. Acceptance/pickup work for existing reserved orders. Fresh
databases contain no orders; no endpoint bypasses credit reservation to seed them.
Expiry/retry batch methods exist but no production scheduler runs them yet.

## Structure

- `src/api/`: Express routes, controllers, DTOs and services.
- `src/auth/`: AuthProvider interface, factory and LocalJwtAuthProvider.
- `src/domain/`: transport-independent lifecycle and authorization rules.
- `src/dependencies/`: UserDirectory, SupplierDirectory and CreditGateway contracts.
- `src/db.ts`, `src/env.ts`: database and validated configuration.
- `prisma/`: Order-owned schema and committed migrations.
- `tests/`: auth/HTTP tests and real PostgreSQL integration tests.
- `grpc/`: preserved independent gRPC workspace scaffold. Its GetOrder remains
  UNIMPLEMENTED; it does not start with REST. The provisional shared protobuf
  statuses will be aligned when the business RPC/lifecycle is implemented.

## Docker setup (database and REST service)

Requires Docker Desktop and User Service's existing public key at
`user-service/keys/public.pem`. If the key pair does not exist, generate it once
using User Service's `npm run keys:generate`; do not regenerate an existing pair.
User Service need not be running. Only its public key is mounted, read-only;
neither signing keys nor .env files are included in the image.

From the repository root:

```sh
docker compose -f order-service/compose.yaml up --build -d --wait
curl -i http://localhost:3002/health
docker compose -f order-service/compose.yaml ps
```

Expected: both containers healthy and `/health` returns 200 with
`{"status":"ok","db":"up"}`. Docker builds the Linux Prisma client, waits for
PostgreSQL readiness, applies committed migrations, then starts the REST server
as a non-root user. There is no need for a host Node install or Order .env file
for this path when the public key already exists. The Prisma CLI is intentionally
retained in the runtime image to run migrations at startup.

The stack uses its own network/database volume. REST is exposed on 3002 and the
database on 5433, both on localhost. Stop a host-run Order server or the earlier
`foc-order-db` container before using those same ports. Alternatively:

```sh
ORDER_HTTP_PORT=3003 ORDER_DATABASE_PORT=5434 \
  docker compose -f order-service/compose.yaml up --build -d --wait
```

Then check `/health` on port 3003. To use another public-key file, set
`ORDER_PUBLIC_KEY_PATH` to its absolute path. These three settings may also be
set in `order-service/.env`; Compose always supplies the container's DATABASE_URL
with host `postgres`, not the host-development URL.

Logs and shutdown:

```sh
docker compose -f order-service/compose.yaml logs order-service
docker compose -f order-service/compose.yaml down
```

Shutdown retains data. `down -v` deletes this stack's database volume, so use it
only when deliberately resetting its data. Source changes require rebuilding
the image. The independent gRPC scaffold is not started by this REST stack.

## Local setup (host REST service)

Requires Node.js 20+ and an Order-owned PostgreSQL database. Install dependencies
from the repository root:

```sh
npm ci
```

For a local database, one option is a dedicated container (choose another host
port if 5433 is occupied):

```sh
docker run --detach --name foc-order-db \
  --publish 127.0.0.1:5433:5432 \
  --env POSTGRES_USER=order_service \
  --env POSTGRES_PASSWORD=order_service \
  --env POSTGRES_DB=order_service \
  --volume foc-order-pgdata:/var/lib/postgresql/data postgres:16
```

From `order-service/`:

```sh
cp .env.example .env
npm run prisma:deploy
npm run prisma:generate
npm run dev
```

Set `USER_SERVICE_PUBLIC_KEY_PATH` to User Service's RSA **public** key. User
Service generates its pair with its existing `keys:generate` command. Order does
not need User Service running to verify a token and never needs its private key.

`DATABASE_URL` must point only to Order's database. REST defaults to port 3002
to avoid the existing User/Supplier port 3001 conflict. `AUTH_PROVIDER=local` is
the only supported provider. Optional `JWT_ISSUER` and `JWT_AUDIENCE` checks must
remain unset unless User Service starts issuing matching claims. The existing
scaffold keeps its own `grpc/.env.example` and ports.

Use `npm run prisma:migrate -- --name descriptive_name` to create future schema
changes. Use `prisma:deploy` to apply committed migrations; never use db push.

For the compiled application:

```sh
npm run build
npm start
```

Build generates an isolated Prisma client and copies its runtime into dist.

## REST reads

JWTs require RS256, a nonblank `sub`, future `exp`, and a nonempty array of known
roles (`USER`, `ADMINISTRATOR`). `nbf` is respected. Invalid credentials return
401; insufficient role/ownership returns 403. AuthProvider authenticates;
role middleware and business services authorize. A future remote provider can
implement the same interface; it is not implemented or selected as a fallback.

| Route | Authorization | Response |
| --- | --- | --- |
| `GET /health` | Public | 200 `{status:"ok",db:"up"}` or 503 degraded/down |
| `GET /orders` or `?scope=open` | USER | Available Unassigned orders excluding caller's own |
| `GET /orders?scope=requested` | USER | Caller's requests, including terminal history |
| `GET /orders?scope=assigned` | USER | Caller's courier orders, including terminal history |
| `GET /orders?scope=all` | ADMINISTRATOR | All published orders |
| `GET /orders/:id` | Participant or admin; otherwise USER viewing available open order | One order |

Lists use `{ "orders": [...] }`, details `{ "order": {...} }`. IDs are strings;
`supplierId` is a decimal string without bigint precision loss. Dates are ISO
UTC strings; optional fields are null. Statuses are uppercase domain enums.
Details contain requester/courier IDs and snapshot names, pickup snapshots,
destination, requestDetails, credits, expiryTime, status, cancellationReason,
creditState, createdAt/updatedAt and lifecycle timestamps. Internal creation
payloads, request fingerprints, idempotency keys and retry errors are not exposed.

Invalid scopes/UUIDs return 400; absent orders return 404. Unexpected errors return
generic JSON 500 responses.

Open availability uses database `statement_timestamp()`, with expiry at
`expiryTime <= database time`. Participant/admin reads retain overdue records;
The expiry batch cancels them when called with a configured Credit gateway;
normal startup does not yet schedule that batch. Display dates in Asia/Singapore in
the future frontend adapter; the browser must send offset-bearing ISO instants.

## Persistence and later credit phases

`OrderCreation` stores an internal intent with the stable UUID and a unique
requester/idempotency-key pair. `Order` references that intent using the same
UUID. `CreditOperation` references the intent so reservation/refund recovery
records can exist even before an Order is published. Unique order/operation-type
pairs prevent duplicate intents. Phase 2 commands use these tables transactionally.

User/Supplier IDs are external references without cross-service foreign keys.
Order reads use stored public-name and pickup snapshots, so reads never call
User/Supplier. Creation resolves snapshots through injected interfaces; real
adapters are deferred. Acceptance leaves optional courierName null until profile
enrichment is integrated.

Constraints enforce positive credits/supplier IDs, nonblank required text,
requester/courier separation, assignment, expiry-after-creation, lifecycle
timestamps, cancellation reasons and status-compatible credit states. Some
constraints are SQL-only; retain them in future migrations.

Creation requires a confirmed reservation receipt matching order ID, requester
and amount before publishing Unassigned. A stored RESERVED field alone is not
proof of credit activity. A real Credit adapter is now opt-in; see the handoff section below.
The PDF lifecycle is Unassigned -> Assigned -> Picked-up -> Delivered.
Requester cancellation is allowed only while Unassigned. Expiry cancels all
nonterminal orders, including after pickup, and refunds the requester. A courier
may therefore hold the item but receive no reward after expiry; item return,
reimbursement and disputes are unspecified. Delivered/Cancelled are terminal.

## Write APIs and dependency boundaries

The startup column below describes the default configuration with Credit disabled.
With Credit configured, delivery/cancellation call the real gateway; creation still
requires User/Supplier adapters.

All writes require USER; admin-only tokens do not bypass ownership or transitions.
The acting identity always comes from JWT, not the request body.

| Route | Rule | Normal startup today |
| --- | --- | --- |
| `POST /orders` | Create after confirmed reservation; requires Idempotency-Key | 503, no side effects |
| `POST /orders/:id/accept` | Non-requester; Unassigned and unexpired | Implemented |
| `POST /orders/:id/pickup` | Assigned courier; Assigned and unexpired | Implemented |
| `POST /orders/:id/deliver` | Assigned courier; Picked-up and unexpired; settle credits | 503, no side effects |
| `POST /orders/:id/cancel` | Requester; Unassigned and unexpired; refund | 503, no side effects |

Creation body (all other fields are rejected):

```json
{
  "supplierId": "1",
  "destination": "PGP",
  "requestDetails": "Pick up one latte",
  "credits": 4,
  "expiryTime": "2099-01-01T08:00:00+08:00"
}
```

Dates require an explicit offset and are normalized to UTC. Credits are positive
int32 integers. Supplier IDs are positive decimal strings within PostgreSQL's
signed bigint range. Lifecycle requests accept no body fields. There is no
general edit/delete API and no requester confirmation step.

With configured dependencies, new creation returns 201 `{order}`; a repeated
identical request/key returns 200 with the same order. Changed input with the
same requester/key returns 409. An uncertain reservation returns 202
`{creationId,state:"PENDING"}` without a published order. Retry the same body and
key to resume; do not generate a new key because a timeout may have reserved funds.

Acceptance/pickup return 200 `{order}`. Delivery/cancellation return 200 only
when the credit receipt is confirmed; otherwise 202 `{order}` with
SETTLEMENT_PENDING/REFUND_PENDING. Retrying the same terminal action preserves
the terminal status and reuses its operation ID. Invalid transitions, expired
orders and dependency rejections return 409; ownership failures 403; missing
records 404; validation failures 400; unavailable integration 503.

`createOrderCommands(db, dependencies)` exposes `createOrder`, `transition`,
`expireOrders`, and `retryPendingCredits`. Do not expose the batch methods as
public student endpoints. Expiry uses a bounded SKIP LOCKED batch; retry methods
lease pending settlement/refund work for 30 seconds and reclaim expired leases.
Creation reservation recovery currently uses same-key request replay. These are
internal methods, not a running worker. Real scheduler cadence, RPC deadlines,
retry backoff and operational monitoring belong to the later integration phase.

The CreditGateway must enforce atomic/idempotent mutations using stable order
and operation IDs. Rejected means definitive rejection, while thrown errors or
timeouts mean unknown. Confirmed-but-unpersisted creation remains resumable;
expiry before publication records a compensating refund. Permanent credit
rejections retain a pending financial state and a failed operation for later
operator investigation; they are never presented as successful payment.

## Test the core functions (without other services)

This is the primary way to test successful creation/lifecycle in this phase.
Requires Node.js 20+, Docker Desktop, and available port 55435. From repo root:

```sh
npm ci
npm run build --workspace @foc/order-service
npm run test:order
npm run test:typecheck --workspace @foc/order-service

docker run --detach --name foc-order-core-tests \
  --publish 127.0.0.1:55435:5432 \
  --env POSTGRES_USER=order_service \
  --env POSTGRES_PASSWORD=order_service \
  --env POSTGRES_DB=order_service_test postgres:16

docker exec foc-order-core-tests pg_isready -U order_service -d order_service_test
```

Wait until pg_isready reports accepting connections, then:

```sh
TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55435/order_service_test \
  npm run test:order:integration
```

Expected: **22 auth/HTTP/domain/adapter tests and 24 database integration tests pass**. The
integration runner applies committed migrations and executes both read and core
command suites sequentially. It creates test users/supplier snapshots and a
test-only idempotent credit ledger inside the test process. No real User,
Supplier or Credit server, JWT key file, or .env file is required for these tests.
Fixtures are cleaned up; do not expect test orders to remain for manual browsing.

Coverage includes successful creation and HTTP 201, same-key/conflicting/concurrent
requests, rejected/uncertain/mismatched reservation responses, failed publication,
compensation on expiry, acceptance races, ownership, pickup, terminal immutability,
pending settlement/refund replay, picked-up expiry, concurrent expiry/retry batches,
and the existing Phase 1 persistence/authentication behavior.

Remove only this temporary test container and its temporary data when finished:

```sh
docker rm --force --volumes foc-order-core-tests
```

If that container already exists, start it with `docker start foc-order-core-tests`
instead of repeating docker run. TEST_DATABASE_URL must name order_service_test
or order_service_test_<suffix>; tests never fall back to the normal DATABASE_URL.

## Manual Docker checks

Start the Docker stack as described above (use port 3003 below if using alternate
ports). Obtain a student token by logging into User Service, then in the same shell:

```sh
TOKEN='your-real-token'
curl -i http://localhost:3003/health
curl -i http://localhost:3003/orders -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3003/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: manual-order-1' \
  -d '{"supplierId":"1","destination":"PGP","requestDetails":"One latte","credits":4,"expiryTime":"2099-01-01T00:00:00Z"}'
```

Expected: health 200, list 200 (empty on a new database), creation **503** because
the real dependencies are not integrated. A missing key/invalid body returns 400;
no bearer token returns 401. This is expected and is tested; do not enable a
fake credit gateway in Docker to turn it into a misleading creation success.

## Verification

From the repository root:

```sh
npm run build --workspace @foc/order-service
npm run test:order
npm run test:typecheck --workspace @foc/order-service
```

Integration tests require a **dedicated** database named `order_service_test`
(or `order_service_test_<suffix>`). They deploy migrations automatically and
remove only their own fixture records. They refuse to use DATABASE_URL as a
fallback. For the local container above:

```sh
docker exec foc-order-db createdb -U order_service order_service_test
TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:5433/order_service_test \
  npm run test:order:integration
```

Tests exercise RSA signature/claim validation, scope/ownership authorization,
database-clock availability, bigint/date serialization, database constraints,
unique intents, health success/failure and persistence across new clients/API
instances, plus the Phase 2 command suites described above. Real credit operations,
combined multi-service end-to-end deployment,
and frontend integration remain in the later approved phases.

## Credit PR integration handoff

The Order adapter uses the merged Credit Service's camelCase client contract,
including current reservation lookup and automatic retries. Credit now lives at
`credit-service/` (not `credit-service/grpc/`). Shared protobufs are the wire
authority; regenerate their types after contract changes.

To opt in when running REST locally, set `CREDIT_GRPC_ADDR=127.0.0.1:50054`
and `CREDIT_ORDER_SERVICE_TOKEN` to the Order credential. Order connects to Credit
using plaintext gRPC for both localhost and container/service DNS addresses.
`CREDIT_RPC_TIMEOUT_MS` defaults to 3000 and bounds the whole RPC, including retries
performed by the shared client. The credential is sent as `x-credit-service-token`
on every call. In containers, set `CREDIT_GRPC_ADDR=credit-service:50054` (or the
actual Credit service DNS name) and inject the matching service token; the default
Compose stack does not enable Credit integration. No configuration means
Credit-dependent writes remain gated. A configured address without a service
token fails startup rather than silently disabling integration.

`createCreditGateway` maps refund to release (no extra balance grant), keeps our
operation UUID local, and relies on Credit's `(RPC operation, orderId)` retry identity.
Missing accounts and permission/configuration failures remain recoverable pending
work. Only sanitized numeric status and reason categories are persisted; raw gRPC
messages/metadata are not. Transport failures remain uncertain.

Creation recovery bypasses the advisory balance precheck after a reservation has
been attempted. Before publication it checks the current reservation, including
when a successful reserve receipt was persisted earlier: mutation replay responses
may be historical. A missing/mismatched/terminal current reservation leaves creation
pending for investigation rather than publishing an unfunded order.

User/Supplier production adapters, User registration credit initialization, scheduled
expiry/recovery, and reward editing are still separate work. Reward editing is not
exposed: do not call UpdateReservation outside a coordinated durable Order workflow.
There is no additional requester confirmation before courier delivery settlement.


## Verification after merging main

After integrating feat/credit-implementation, its Credit ledger can be tested with
Order persistence over real gRPC. The old Credit implementation is no longer supported
by this suite; use the external-branch command below before integration.
User/Supplier snapshots remain test doubles in this suite; it does not certify
registration hooks or a complete deployed system. Use two separate dedicated test
databases, never the normal service databases:

```sh
npm ci
npm run build
TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55435/order_service_test \
CREDIT_TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55435/credit_test \
  npm run test:credit-integration --workspace @foc/order-service
```

The four compatibility tests check missing-account/duplicate event initialization,
reserve/publication and one-time settlement,
cancellation without an extra balance grant, and picked-up expiry plus the distinction
between historical mutation receipts and current reservation state. Test migrations
are applied only to these explicitly named test databases. Run this suite separately
from other suites using the same Credit test database.

User Service now implements public-profile lookup and refresh-token sessions, but
Order's UserDirectory adapter is still absent. Existing signed access JWTs remain
compatible. Supplier's GetSupplier RPC remains a stub; IsOpen alone cannot provide
Order's pickup snapshot. The separate pending-intent race policy is still not wired
to the REST row-lock implementation; no queue priority or reward editing is claimed.


## Compatibility with feat/credit-implementation

Retries happen in the shared gRPC client for UNAVAILABLE, ABORTED and
DEADLINE_EXCEEDED, within one CREDIT_RPC_TIMEOUT_MS deadline. Order does not add
per-call retries. Exhausted or ambiguous mutations remain pending; CreditOperation
and retryPendingCredits still provide durable workflow recovery. Current
GetReservation state is checked before order publication. The camelCase RPC fields
and x-credit-service-token credential match this branch.

The new Credit implementation initializes accounts through user.created, not
InitCredits RPC. Order does not create accounts. Until the User/broker integration
is connected, creation requires a separately initialized Credit account. Missing
accounts stay unavailable/recoverable. Order-to-Credit gRPC is plaintext in all
environments and continues to require the Order service token.
The default Order Compose stack does not configure a Credit connection.

To test against this unmerged branch without switching branches or merging:

```sh
npm ci
npm run build --workspace @foc/grpc --workspace @foc/order-service

# New temporary container; do not reuse normal service databases.
docker run --detach --name foc-order-credit-handoff-tests \
  --publish 127.0.0.1:55436:5432 \
  --env POSTGRES_USER=order_service \
  --env POSTGRES_PASSWORD=order_service \
  --env POSTGRES_DB=order_service_test postgres:17-alpine

docker exec foc-order-credit-handoff-tests pg_isready -U order_service -d order_service_test
# Once accepting connections; create this database once:
docker exec foc-order-credit-handoff-tests createdb -U order_service credit_test

TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55436/order_service_test \
CREDIT_TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55436/credit_test \
  node order-service/scripts/testCreditFeature.cjs
```

The script exports the locally available origin/feat/credit-implementation ref
into a temporary directory, builds its own shared contract and Credit service,
and removes the export afterwards. An optional first argument selects another
local Git ref. Fetch the branch first if your remote-tracking ref is outdated.
Credit migrations 001–006 run once in a unique temporary schema inside credit_test;
that schema is removed afterwards. Order migrations target only order_service_test.
The four tests use real Order persistence and real Credit gRPC/transactions for
publication/settlement, cancellation, picked-up expiry/historical receipts, and
missing-account/duplicate user.created allocation. User/Supplier snapshots are
still test doubles; no running RabbitMQ or full UI flow is certified.

Remove only this disposable test container when finished:

```sh
docker rm --force --volumes foc-order-credit-handoff-tests
```
