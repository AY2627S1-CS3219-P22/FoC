# Order Service - Friend on Campus

Phase 1 implements PostgreSQL persistence, provider-independent authentication,
local RS256 JWT verification, protected order reads, and a DB-aware health check.
There is no order creation, lifecycle mutation, automatic expiry worker, or
credit execution yet. New installations therefore list zero orders. Integration
tests create their own records; there is no production seed or unreserved-order
creation endpoint.

## Structure

- `src/api/`: Express routes, controllers, DTOs and services.
- `src/auth/`: AuthProvider interface, factory and LocalJwtAuthProvider.
- `src/db.ts`, `src/env.ts`: database and validated configuration.
- `prisma/`: Order-owned schema and committed migrations.
- `tests/`: auth/HTTP tests and real PostgreSQL integration tests.
- `grpc/`: preserved independent gRPC workspace scaffold. Its GetOrder remains
  UNIMPLEMENTED; it does not start with REST. The provisional shared protobuf
  statuses will be aligned when the business RPC/lifecycle is implemented.

## Local setup

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

Invalid scopes/UUIDs return 400; absent orders return 404. Other routes/methods
are not implemented. Unexpected errors return generic JSON 500 responses.

Open availability uses database `statement_timestamp()`, with expiry at
`expiryTime <= database time`. Participant/admin reads retain overdue records;
Phase 1 does not mutate them into Cancelled. Display dates in Asia/Singapore in
the future frontend adapter; the browser must send offset-bearing ISO instants.

## Persistence and later credit phases

`OrderCreation` stores an internal intent with the stable UUID and a unique
requester/idempotency-key pair. `Order` references that intent using the same
UUID. `CreditOperation` references the intent so reservation/refund recovery
records can exist even before an Order is published. Unique order/operation-type
pairs prevent duplicate intents. Phase 1 contains these tables, not their
execution/recovery logic.

User/Supplier IDs are external references without cross-service foreign keys.
Order reads use stored public-name and pickup snapshots, so reads never call
User/Supplier. Phase 2 will populate those snapshots from real services.

Constraints enforce positive credits/supplier IDs, nonblank required text,
requester/courier separation, assignment, expiry-after-creation, lifecycle
timestamps, cancellation reasons and status-compatible credit states. Some
constraints are SQL-only; retain them in future migrations.

`RESERVED` is a stored credit-state value, not a real credit reservation by this
Phase 1 app. Phase 3 must confirm reservation before publishing an Order.
The PDF's eventual lifecycle is Unassigned -> Assigned -> Picked-up -> Delivered.
Requester cancellation is allowed only while Unassigned. Expiry cancels all
nonterminal orders, including after pickup, and refunds the requester. A courier
may therefore hold the item but receive no reward after expiry; item return,
reimbursement and disputes are unspecified. Delivered/Cancelled are terminal.

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
instances. Docker deployment, real credit operations and frontend integration
remain in the later approved phases.
