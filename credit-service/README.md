# Credit infrastructure

This branch adds the Credit Service database schema, migrations, and a Docker image
for the existing gRPC scaffold. The core credit handlers are implemented separately
on `credit-core-implementation`; RPCs on this branch still return `UNIMPLEMENTED`.
The application package remains in `credit-service/grpc/` on this branch.

## Run the containers

Start Docker Desktop. From the repository root:

```bash
docker compose -f credit-service/compose.yaml --profile app up -d --build --wait
```

Compose waits for PostgreSQL, runs the migrations in a one-off container, then starts
the gRPC scaffold. The image uses Node.js 22, compiled JavaScript, production
dependencies, and the unprivileged `node` user. Its build context is the repository
root because the application imports the shared `@foc/grpc` workspace. The Dockerfile
has its own allowlist for build inputs; local `.env` files and private keys are excluded.

| Component | Host address | Container address |
| --- | --- | --- |
| Credit gRPC scaffold | `127.0.0.1:50053` | `app:50053` |
| Development PostgreSQL | `127.0.0.1:54333` | `db:5432` |

The local database is `credit`, with username/password `credit`. Database data stays
in the `credit-data` named volume. Stop the stack while preserving its data:

```bash
docker compose -f credit-service/compose.yaml --profile app down
```

After adding a migration, run it against the existing database before restarting:

```bash
docker compose -f credit-service/compose.yaml --profile app build
docker compose -f credit-service/compose.yaml --profile app run --rm migrate
docker compose -f credit-service/compose.yaml --profile app up -d --wait
```

This is a local development stack. The scaffold uses insecure gRPC and has no
implemented credit operations. Keep the host binding on loopback. Deployment of
the core API requires its scoped credentials, TLS, and an updated health probe;
the scaffold probe specifically expects an `UNIMPLEMENTED` response. Peer DNS
names in Compose are placeholders for a future shared network; those services
are not started by this stack.

## Run Node on the host

Use Node.js 22. From the repository root:

```bash
npm ci
npm run build
docker compose -f credit-service/compose.yaml up -d --wait db
cp credit-service/grpc/.env.example credit-service/grpc/.env
npm run db:migrate --workspace @foc/credit-grpc
npm run dev --workspace @foc/credit-grpc
```

Copy the example environment only when you do not already have a local `.env`.
The migration runner needs only `DATABASE_URL`; it does not require a running
gRPC server. The scaffold does not yet access the database during RPC handling.

## Database schema and verification

See [the schema reference](db/README.md) for tables, relationships, and constraints.
There is no seed data. User Service will initialise accounts through the core API.

Run schema checks against the dedicated, temporary test database:

```bash
docker compose -f credit-service/compose.yaml --profile test up -d --wait test-db
CREDIT_TEST_DATABASE_URL=postgresql://credit:credit@127.0.0.1:54334/credit_test npm run test:schema --workspace @foc/credit-grpc
docker compose -f credit-service/compose.yaml --profile test stop test-db
```

`test-db` keeps data in memory and loses it when stopped. The tests refuse to run
against a database whose name is not `credit_test`. Run `npm test` for the existing
shared gRPC transport tests.

The two SQL migrations match the core API branch byte for byte so that databases
created here can be adopted by its checksum-based migration runner. When merging
the core API later, preserve these migrations and reconcile the package relocation,
Compose setup, and runtime security settings.
