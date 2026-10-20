<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Documented supplied references, Docker/pg migration tooling, the human-specified schema/contract alignment, and approved JSON attribution.
Human Reviewed.
Changes from entries 007–012: Pending human review.
Prompts and key responses: ai/usage-log.md, entries 003–012.
-->

# Credit service


## Local containers

From the repository root, start PostgreSQL 17 and build the existing credit gRPC
scaffold with the checked-in local example configuration:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml up -d --build
```

For your own values, use an ignored file such as `credit-service/.env` and pass
that path using `--env-file`. Existing `.env` files are not changed by this setup.
The example password is for local development only.

Start only the database:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml up -d postgres
```

The database is named `credit_service`, its username is `credit_service`, and its
host port defaults to `5433` (override with `CREDIT_POSTGRES_PORT`). Inside the
Compose network it is available at `postgres:5432`. PostgreSQL data is stored in
the `credit_service_pgdata` named volume, mounted at `/var/lib/postgresql/data`
for PostgreSQL 17, as documented by the
[official PostgreSQL image](https://github.com/docker-library/docs/blob/master/postgres/README.md).

Open a database shell:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec postgres psql -U credit_service -d credit_service
```

The gRPC scaffold listens on `localhost:50054`. Its handlers still return
`UNIMPLEMENTED`; no REST API or domain operations have been added. The four
application tables are defined by the initial SQL migration. The migration CLI
can connect using `pg`; business handlers do not yet
access the database. The existing peer service addresses are configured
for same-network service names; this Compose file starts only credit-service
and PostgreSQL. Cross-service execution is pending integration with those peers.

Compose waits for the PostgreSQL health check before starting the scaffold using
[`service_healthy`](https://docs.docker.com/compose/how-tos/startup-order/).
Schema migration is an explicit step after container startup; see below.

Stop these containers while keeping the database volume:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml down
```

## SQL migration tooling

`pg` is installed in the credit gRPC workspace. The migration CLI applies one
explicitly selected `.sql` file inside a transaction, committing on success and
rolling back on failure. It uses the standard `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, and `PGDATABASE` connection variables; `PGDATABASE` must be set
explicitly. Connection and transaction APIs follow the
[node-postgres connection documentation](https://node-postgres.com/features/connecting)
and [transaction documentation](https://node-postgres.com/features/transactions).

For a fresh database, apply the initial migration once after starting the
containers, from the repository root:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- ../migrations/001_initial.sql
```

Apply the follow-up migrations in order after the initial migration:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- ../migrations/002_align_credit_contract.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- ../migrations/003_uppercase_reservation_status.sql
```

The current local development database has had all three migrations applied.
For a fresh database when running the migration CLI on the host, the equivalent
command using the checked-in local example connection values is:

```sh
PGHOST=127.0.0.1 PGPORT=5433 PGUSER=credit_service PGPASSWORD=credit_service_local PGDATABASE=credit_service node credit-service/grpc/scripts/apply-migration.cjs credit-service/migrations/001_initial.sql
```

The workspace also exposes `npm run db:migrate --workspace @foc/credit-grpc --
<migration.sql>`; relative file paths for that command are resolved from
`credit-service/grpc/`. SQL files must not include their own transaction-control
statements. This CLI does not maintain a migration ledger or automatically skip
previously applied files. Reapplying the initial migration reports an existing
table error and rolls back. No application SQL is applied at container startup.
The runtime image includes the CLI and migration files and has the PostgreSQL
connection variables configured by Compose.

History uses `total_amount_change` and `total_reserved_change` as signed integer
deltas, including negative values. PostgreSQL's
[`integer` type](https://www.postgresql.org/docs/17/datatype-numeric.html)
supports negative whole numbers. Reservation/history IDs default to
[`gen_random_uuid()`](https://www.postgresql.org/docs/17/functions-uuid.html).
The supplied `now()` defaults initialize timestamps on insertion;
[`DEFAULT` values](https://www.postgresql.org/docs/17/ddl-default.html)
do not automatically refresh `updated_at` on subsequent updates.
Reservation `version` and account `total_credits` are required application inputs;
registration-time allocation of 10 credits remains application behavior.

Run the migration-tool tests against local PostgreSQL from the repository root:

```sh
PGHOST=127.0.0.1 PGPORT=5433 PGUSER=credit_service PGPASSWORD=credit_service_local PGDATABASE=credit_service npm test --workspace @foc/credit-grpc
```

The integration tests use generated temporary schemas and remove them afterward.
They verify migration commit/rollback, defaults, balance invariants, foreign keys,
signed history deltas, allowed status/type values, idempotency key scope, and
preservation of existing rows across the requester/status changes.
Without `PGDATABASE`, integration checks are skipped; the CLI validation tests
still run.

Shared contract round-trip tests run with `npm test` at the repository root after
`npm run build`. The human's latest contract uses `amount`, superseding the
interim `creditAmount` name;
protobuf field numbers and existing enum numeric values are retained. The
nine declared RPCs have a four-field initialization response, three-balance reads, seven-field mutation
responses, read-only reservation lookup, and shared history pages as described in
[the shared gRPC README](../shared/grpc/README.md#credit-contract-alignment).

The human supplied the [nine-method RPC list](ai/prompts/009-finalized-rpc-list.md).
Request messages include optional history pagination and `expectedVersion`.
Reservation update/lookup and both history RPCs have client wrappers and
unimplemented handlers. History uses one `CreditHistoryPage` with `entries` and
`next_page_token`, and all history-table fields in each entry. `InitCredits` returns
exactly `user_id`, `total_credits`, `reserved_credits`, and `available_credits` and
has a client wrapper and unimplemented handler. The human confirmed SHA-256,
deterministic key recomputation, and lock/hash/atomic-save behavior; the concrete
hashing/locking implementation remains unimplemented.
Initialization must handle failure/delay after registration and never grant
another initial 10 credits for duplicates or future restoration. Its business
behavior remains unimplemented. Duplicate initialization follows the human's
general replay rule: return the original saved success without another grant.
The finalized response adds no separate status fields.

The human requested `requester_id` and confirmed `RESERVED`, `RELEASED`, `SETTLED`
everywhere, with `RESERVED` as the default. Migrations 002 and 003 apply those
updates after migration 001. No schema or database changes are needed for the
external `amount` request name; it maps to SQL `credit_amount`.

## Attribution for JSON files

On 2026-10-20 the human approved documenting attribution here and in
[usage-log entry 005](ai/usage-log.md#005--confirm-column-rules-and-add-pg-migration-tooling)
for JSON files that cannot contain comments.

| File | Tool, date, and scope | Author review |
| --- | --- | --- |
| `credit-service/grpc/package.json` | OpenAI Codex (GPT-6), 2026-10-20: added `pg`, migration CLI command, and test command. | Pending human review. |
| Root `package-lock.json` | OpenAI Codex (GPT-6), 2026-10-20: ran npm to record the `pg` dependency and its transitive packages; npm also normalized existing package flags. | Pending human review. |


Human-supplied requirements and design are recorded in
[docs/user-decisions.md](docs/user-decisions.md). AI prompts, key responses, and
verification results are recorded in [the service usage log](ai/usage-log.md).

The human has selected `pg` with SQL migrations and confirmed the table names.
`archived_balances` is deferred until User Service implements archival.
[001_initial.sql](migrations/001_initial.sql) implements `credit_accounts`,
`reservations`, `credit_history`, and `idempotency_records` as specified in
[the design reference](docs/user-decisions.md).
