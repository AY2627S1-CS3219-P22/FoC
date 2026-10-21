<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-21.
Scope: Generated Order development, database and Docker setup documentation. Team review pending.
See usage-log.md. -->

# Order Service

## Local PostgreSQL

Requires Docker Desktop running. From the repository root:

```sh
docker compose -f order-service/compose.yaml up -d postgres --wait
docker compose -f order-service/compose.yaml ps
docker compose -f order-service/compose.yaml exec postgres psql -U order_service -d order_service
```

The stack uses PostgreSQL 16, matching User Service, with a persistent named
volume and a readiness check. Local development credentials are
`order_service` for both username and password. The host connection URL is:

```text
postgresql://order_service:order_service@127.0.0.1:5433/order_service
```

If port 5433 is occupied, prefix the startup command with
`ORDER_DATABASE_PORT=5434` and use that port in the host connection URL.
Within this Compose network the database address is `postgres:5432`.

Stop the stack while retaining data:

```sh
docker compose -f order-service/compose.yaml down
```

## Prisma schema and migrations

The author-provided schema is in `prisma/schema.prisma`: OrderCreation, Order,
CreditOperation and OrderEditOperation, with the supplied enums, indexes and relationships.
The initial migration is committed as source under `prisma/migrations/` and has
been applied to the local database. Prisma 6.19.3 matches User Service.

From the repository root, export the local database URL and run:

```sh
export DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:5433/order_service
npm run prisma:validate --workspace @foc/order-grpc
npm run prisma:deploy --workspace @foc/order-grpc
npm run prisma:generate --workspace @foc/order-grpc
npm run prisma:status --workspace @foc/order-grpc
```

For team-approved schema changes, create a migration locally with:

```sh
npm run prisma:migrate --workspace @foc/order-grpc -- --name descriptive_name
```

Use migration files rather than `db push`. The application container applies
committed migrations before starting. For host development, apply them explicitly
using the commands above. Generated client files live in `grpc/src/generated/prisma`
and are ignored by Git.

PostgreSQL row locks implement the author's confirmed first-lock-wins rule for
Order mutations. CreditOperation and OrderEditOperation persist recovery work.
Acceptance/pickup/delivery endpoints remain outside this change.

## Application structure

The existing `@foc/order-grpc` workspace remains in `order-service/grpc`. It now
runs Express REST and gRPC together, following User Service conventions:

- `grpc/src/api/app.ts`: Express application and database-backed health endpoint.
- `grpc/src/grpc/`: existing RPC server/clients; GetOrder remains UNIMPLEMENTED.
- `grpc/src/env.ts`: dotenv loading and Zod configuration validation.
- `grpc/src/db.ts`: service-specific Prisma client and database probe.
- `grpc/src/index.ts`: database connection, HTTP/gRPC startup and shutdown.
- `prisma/`: author-supplied schema and migrations.

Creation, editing and cancellation routes/controllers use shared services under
`grpc/src/services`. Production RPC adapters live in `grpc/src/dependencies`.
Request JWTs are verified using the User Service public key in `grpc/src/auth`.

## Host development

Requires Node.js 20+ and Docker Desktop. From the repository root:

```sh
npm ci
cp order-service/grpc/.env.example order-service/grpc/.env
# Edit the copied file if using different database or server ports.
docker compose -f order-service/compose.yaml up -d postgres --wait
```

Do not overwrite an existing `.env`; update it instead. npm workspace commands
run with `order-service/grpc` as the working directory, so dotenv loads that
workspace's `.env`. Existing shell variables take precedence.

```sh
export DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:5433/order_service
npm run prisma:deploy --workspace @foc/order-grpc
npm run dev --workspace @foc/order-grpc
```

The dev script builds the shared gRPC library and generates the Order Prisma
client first. For compiled startup, build the shared library and Order service:

```sh
npm run build --workspace @foc/grpc --workspace @foc/order-grpc
npm start --workspace @foc/order-grpc
```

`DATABASE_URL` is required and must be a PostgreSQL URL. `PORT` defaults to 3003;
`GRPC_PORT` to 50053; `GRPC_HOST` to 0.0.0.0. Ports must be 1–65535. Other RPC
settings and local peer addresses are listed in `grpc/.env.example`. No peer
service needs to be running for startup or health checks. The application fails
startup on invalid settings or an unavailable database.

## Docker application startup

From the repository root:

```sh
docker compose -f order-service/compose.yaml up --build -d --wait
curl -i http://localhost:3003/health
docker compose -f order-service/compose.yaml ps
docker compose -f order-service/compose.yaml logs order-service
```

Expected: both containers healthy and HTTP 200 with `{"status":"ok","db":"up"}`.
If the database becomes unavailable, `/health` returns HTTP 503 with
`{"status":"degraded","db":"down"}`. Startup applies committed migrations and
then starts both REST (3003) and gRPC (50053), running as the node user. Docker
builds its own Linux Prisma client. The image excludes local `.env`, keys,
node_modules and host-generated clients. Prisma CLI remains available for the
startup migration command.

Stop a host-run Order process before starting the application container, or
choose alternate published ports:

```sh
ORDER_HTTP_PORT=3013 ORDER_GRPC_PORT=50063 \
  docker compose -f order-service/compose.yaml up --build -d --wait
```

Compose supplies the container database URL explicitly using `postgres:5432`.
The host-development `.env` is not loaded into the image. Stop both containers
with `docker compose -f order-service/compose.yaml down`; the database volume
is retained. Rebuild after application source changes.

## Setup issue verification (2026-10-21)

- [x] Existing team Express/TypeScript framework and dependencies installed.
- [x] Existing workspace retained with api/grpc layout and env/db building blocks.
- [x] dotenv settings loaded and Zod rejects invalid ports/database URL.
- [x] Prisma connects to the Order-owned PostgreSQL database.
- [x] Docker application builds, applies migrations and starts REST plus gRPC.
- [x] GET /health returns 200 when the database is available and 503 when unavailable.
- [x] Setup/startup instructions documented above.

Verified compiled host startup on alternate ports and clean SIGTERM shutdown.
Both Docker containers were restored to healthy after the database-outage check.
These checks cover the initial setup issue. See lifecycle verification below for
subsequent implementation. Team author review remains required.

AI usage records are consolidated in [usage-log.md](usage-log.md). The initial
applied migration retains its historical attribution path to preserve its checksum;
that attribution refers to the same records now maintained in this service.

## Order lifecycle (2026-10-22)

**Peer-service status:** this checkout still has Supplier GetSupplier and the old
Credit handlers as stubs. Successful production creation requires the real User
GetPublicProfile, implemented Supplier GetSupplier/IsOpen, and Credit from the
agreed `feat/credit-implementation` contract. The local copy of that Credit wire
contract is `grpc/proto/credit.proto`; shared contracts and teammate sources are
unchanged. No test doubles are enabled in normal startup.

Configure `grpc/.env` for host development:

```dotenv
USER_SERVICE_PUBLIC_KEY_PATH=../../user-service/keys/public.pem
USER_GRPC_ADDR=localhost:50051
SUPPLIER_GRPC_ADDR=localhost:50052
CREDIT_GRPC_ADDR=localhost:50054
CREDIT_ORDER_SERVICE_TOKEN=your-order-credential
# CREDIT_GRPC_CA_PATH=/absolute/path/to/trusted-credit-ca.pem
```

Use the same credential configured by Credit. Set the CA path when Credit uses
TLS. Leave it unset only for the team's explicit local plaintext Credit mode.
Only User's public key is needed by Order. Configured unreadable key/CA paths
fail startup. Without a public key, Order writes return 503; without a Credit
credential, Credit-dependent writes return 503 and no recovery worker runs.
Health continues to probe PostgreSQL independently.

For Docker with host-run peer services, use the opt-in local override:

```sh
export CREDIT_ORDER_SERVICE_TOKEN=your-order-credential
docker compose -f order-service/compose.yaml \
  -f order-service/compose.lifecycle.yaml up --build -d --wait
```

Generate User's keys through its existing instructions if absent; do not replace
an existing key pair. The override mounts only the public key read-only and uses
Docker Desktop's host.docker.internal for peer RPCs. It assumes explicit local
plaintext Credit mode. For TLS, supply a Compose override mounting the trusted CA
read-only and set CREDIT_GRPC_CA_PATH to its container path and CREDIT_GRPC_ADDR
to the certificate's hostname. The base Compose stack remains usable for health
and database setup without peer configuration.

### HTTP contract

All writes require a valid User RS256 bearer JWT with USER role. The requester ID
comes from the signed subject. ADMINISTRATOR alone does not grant permission.

| Method / route | Behavior | Success |
| --- | --- | --- |
| POST /orders | Create after confirmed credit reservation | 201, 200 replay, 202 pending |
| PATCH /orders/:id | Requester edits an unassigned, unexpired order | 200, 202 pending |
| POST /orders/:id/cancel | Requester cancels an unassigned, unexpired order; retains history | 200, 202 pending refund |

Creation and editing require a nonblank Idempotency-Key header. Creation requires
supplierId (positive bigint decimal string), destination, requestDetails, credits
(positive int32), and expiryTime (ISO timestamp with explicit offset). Editing
accepts any nonempty subset of these five fields. Unknown fields are rejected;
requester identity, names and pickup snapshots cannot be supplied by the client.
Required text must be nonblank; expiry must be at least one hour after database
time at initial creation/edit validation. Supplier must currently be open.

Newly published orders are UNASSIGNED/RESERVED. Returns use `{order: {...}}` with
supplierId serialized as a decimal string and timestamps as ISO UTC. Internal
creation/edit/recovery payloads are not exposed. Pending creation returns
`{creationId, state: "PENDING"}`; pending edit/cancellation returns the current
`{order}` with HTTP 202. Preserve the original body and Idempotency-Key on retries.

Same key + same creation body resumes/returns the original order. Same key + a
changed body returns 409. Different keys are distinct creation requests even if
all fields match; there is **no five-minute duplicate-content rule**. For edits,
reuse the same key for the same patch on the same order; changed patches with
that key return 409. The frontend should disable repeated submission while a
request is processing and reuse its original key after uncertainty.

Validation returns 400, missing/invalid JWT 401, insufficient role/ownership 403,
missing order 404, and conflicts/invalid transitions/dependency rejections 409.
An unavailable dependency returns 503 before recording creation when directory
validation cannot complete. Once creation is durable, an uncertain Credit result
returns 202. Error JSON uses `{error: "..."}`, with creationId where applicable.

### Recovery and expiry

The backend worker starts when Credit is configured; it does not depend on an
open frontend. It recovers pending creation/edit work, expires orders and retries
refunds. Work is persisted before mutating Credit; processing leases survive
restarts. It uses the same stable order ID for reservation/release and the same
expectedVersion for an edit update. Current GetReservation state is checked
rather than trusting historical mutation-replay snapshots.

Explicit business rejection stops that operation. Uncertain work has an initial
attempt plus five retries, delayed by 5, 15, 45, 135 and 135 seconds. A processing
lease lasts 30 seconds; batches contain at most 100 records and the loop polls
after one second. Expiry compensation has its own refund retry budget.

Exhausted reserve/refund work is retained as PERMANENTLY_FAILED with a sanitized
lastError; creation/financial state remains pending until resolved. Exhausted
edits become RECONCILIATION_REQUIRED. These records require operator reconciliation;
no automatic success/refund or administrative reset endpoint is claimed.

Expiry cancels UNASSIGNED, ASSIGNED and PICKED_UP orders with reason EXPIRY and
returns the reservation to the requester. Requester cancellation uses reason
REQUESTER. Cancellation and its REFUND_PENDING intent commit together. REFUNDED
is recorded only after Credit confirms the current reservation is RELEASED.
An expired unpublished creation is compensated rather than published.

Mutations lock Order rows. Active durable edits exclude other edits/cancellation;
expiry may still cancel and release the reservation. No courier-priority guarantee
is implemented: the author's latest decision is first-lock-wins. Courier
acceptance endpoints still need implementation and must observe active edit
operations when acquiring that same row lock. There is no separate DELETE route
and no physical deletion of order history. Listing/history UI is outside this change.

### Lifecycle tests

From the repository root:

```sh
npm ci
npm run build --workspace @foc/grpc --workspace @foc/order-grpc
npm test --workspace @foc/order-grpc
```

For integration tests, use a separate disposable database, never the normal
Order database:

```sh
docker run --detach --name foc-order-lifecycle-tests \
  --publish 127.0.0.1:55437:5432 \
  --env POSTGRES_USER=order_service --env POSTGRES_PASSWORD=order_service \
  --env POSTGRES_DB=order_service_test postgres:16

docker exec foc-order-lifecycle-tests pg_isready -U order_service -d order_service_test
# Once accepting connections:
DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55437/order_service_test \
  npm run prisma:deploy --workspace @foc/order-grpc
TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55437/order_service_test \
  npm run test:integration --workspace @foc/order-grpc
```

If that test container already exists, use docker start instead of docker run.
Tests refuse a missing URL or database name outside order_service_test[_suffix].
They create and remove only their own fixture rows. Test-only peer servers/ledger
exercise PostgreSQL persistence, HTTP authentication/validation, real gRPC adapter
calls, same-key concurrency, business failures, timeouts, crash/worker recovery,
credit edits, cancellation and picked-up expiry. They do not certify deployed
peer-service implementations. Remove only the disposable test container afterward:

```sh
docker rm -f -v foc-order-lifecycle-tests
```

Verified on 2026-10-22: 8 unit/authentication/gRPC tests and 23 PostgreSQL/HTTP/gRPC
integration tests passed (31 total). Docker build/startup, both migrations and
HTTP health passed. These results use test-only peers for successful lifecycle
workflows; production peer integration remains subject to the status above.
