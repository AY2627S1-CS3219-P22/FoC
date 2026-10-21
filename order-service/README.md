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
and CreditOperation, with six enums and the supplied indexes and relationships.
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

PostgreSQL supplies transactions and concurrency primitives. The author's chosen
conditional-update strategy for acceptance remains to be implemented and tested
with the Order handlers. CreditOperation currently stores durable intents only.

## Application structure

The existing `@foc/order-grpc` workspace remains in `order-service/grpc`. It now
runs Express REST and gRPC together, following User Service conventions:

- `grpc/src/api/app.ts`: Express application and database-backed health endpoint.
- `grpc/src/grpc/`: existing RPC server/clients; GetOrder remains UNIMPLEMENTED.
- `grpc/src/env.ts`: dotenv loading and Zod configuration validation.
- `grpc/src/db.ts`: service-specific Prisma client and database probe.
- `grpc/src/index.ts`: database connection, HTTP/gRPC startup and shutdown.
- `prisma/`: author-supplied schema and migrations.

Feature routes, controllers and services will be added when their implementation
is authorized. This issue adds no Order lifecycle endpoints or peer RPC calls.

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
These checks cover the setup issue; business endpoints and conditional acceptance
are still pending. Team author review remains required.

AI usage records are consolidated in [usage-log.md](usage-log.md). The initial
applied migration retains its historical attribution path to preserve its checksum;
that attribution refers to the same records now maintained in this service.
