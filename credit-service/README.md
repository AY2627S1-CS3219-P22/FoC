<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
Scope: Documented human-specified credit rules, SQL migrations, authenticated gRPC, Docker configuration, verification, and approved JSON attribution.
Human Reviewed.
Changes from entries 007–026: Pending human review. The prior Human Reviewed marker does not validate these changes.
Prompts and key responses: ai/usage-log.md, entries 003–026.
-->

# Credit service

CreditService implements account initialization, balance/reservation reads, reserve,
update, release, and settlement using PostgreSQL 17 and `pg` with SQL migrations.
The human's definitions are recorded in [the design reference](docs/user-decisions.md)
and [the exact prompt archives](ai/usage-log.md). Archival is deferred.

## Source layout

The human finalized this layout in [exchange 024](ai/prompts/024-service-src-layout.md):

```text
credit-service/
  src/
    domains/       existing account, reservation, history and idempotency types
    repos/         repository contract, PostgreSQL implementation and lock encoder
    services/      credit rules, validation and history bookmarks
    grpc/          gRPC handlers, service-token authentication, TLS and error mapping
    rest/          REST handlers and user-token authentication
    events/        user.created callback and registration helper
    env.ts
    index.ts
  test/
  scripts/
  migrations/
  package.json
  tsconfig.json
  .env.example
```

There is one Node workspace at credit-service/. Its existing package name remains
@foc/credit-grpc, so npm workspace commands stay the same. TypeScript outputs to
credit-service/dist/. Both transports start from src/index.ts. Package files,
tests and migration tooling now live directly under credit-service rather than
an outer grpc directory. Existing personal env files were not overwritten.
For host startup, merge the needed values from credit-service/.env.example into
the ignored service-root .env; relative public-key paths resolve from that root.

The relocation passed the full build, all 70 credit checks, eight shared checks,
and a clean Docker install/build/start. The local Docker working directory is
/repo/credit-service. No schema or business-operation behavior changed.

## Business operations

- `initCredits({ userId })` is an internal method used by the `user.created`
  callback. New accounts receive 10 total/0 reserved credits exactly once per
  userId, with an `INITIAL_GRANT` history row and saved result in one transaction.
  Matching saved successes replay; confirmed prior grants without saved results
  succeed without writes. An existing account lacking grant evidence fails with
  `ALREADY_EXISTS` and no changes.
- `getBalance` returns userId, total, reserved, and computed available credits. A missing
  account fails; reads never initialize an account.
- `reserveCredits` creates a lifetime-unique reservation per order, holds credits,
  records `RESERVED`, and starts version at 1. Insufficient credits fail without
  changes. Without a saved result, an existing matching requester/amount returns
  the current reservation in any status without writes. A mismatch fails with
  `REQUEST_CONFLICT`.
- `updateReservation` takes the new total held and expected version. It checks
  saved result, existence, active status, matching version, changed amount, then
  available credits for an increase. It applies only the difference, increments
  version, and records signed `RESERVATION_UPDATED` deltas, using the human's
  corrected spelling. Unchanged amounts are rejected.
- `releaseCredits` decreases reserved credits only, marks `RELEASED`, increments
  version, and records `RELEASED`. Settled reservations fail. An already released
  reservation without a saved result returns its current state without writes.
- `settleCredits` atomically decreases the requester's total and reserved credits,
  increases the courier's total, sets `SETTLED`/courier/version, and writes
  `TRANSFER_OUT` and `TRANSFER_IN`. Missing courier accounts and self-settlement
  fail without changes. Courier assignment is validated by Order Service.
- `getReservation` reads the current reservation. The RPC returns the full Reservation message: orderId, requesterId, amount,
  status, optional courierId, reservationId, and version. Missing reservations fail with `NOT_FOUND`.

Mutations own one READ COMMITTED transaction. Lock order is retry key, order
resource (account resource for initialization), then account rows in ascending
user-ID order. Accounts remain locked through history insertion and commit.
The repository never commits or rolls back. Any failure rolls back account,
reservation, history, and retry-result changes together.

Saved successful retries replay before current-state checks. Mutation replies
are snapshots of the state immediately after that operation. An identical reserve
retry after an update can therefore return the original amount/version/status;
call GetReservation to obtain the full current reservation. Existing
missing-result fallback rules above remain unchanged. The operation-scoped
key is userId for initialization, orderId for reserve/release/settle, and
JSON `[orderId, expectedVersion]` for updates. SHA-256 request hashes use the
human's validated-field arrays; caller identity and metadata are excluded.
See [the exact definitions](ai/prompts/014-business-rules-and-implementation-design.md).
The [advisory-lock encoder](src/repos/advisoryLockKey.ts) hashes UTF-8
JSON `[namespace, key]` and converts its first eight bytes to a signed big-endian
64-bit decimal string, following [exchange 019](ai/prompts/019-advisory-lock-key-encoding.md).
PostgreSQL [transaction-level advisory locks](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS)
release at transaction end.

## Initial-allocation implementation

The [user.created callback and registration helper](src/events/userCreated.ts)
accept the human-specified type/eventId/occurredAt/userId event. The callback awaits
committed allocation or confirmation of an existing grant; failures propagate to
the shared messaging client's bounded retry/dead-letter path. Registration takes
a connected shared client and a supplied queue. RabbitMQ startup and User Service
publication belong to teammates and are not wired here. There is no InitCredits RPC.

## gRPC authentication and errors

Following [exchange 026](ai/prompts/026-expanded-read-responses.md), Balance
restores user_id at protobuf field 1 and GetReservation returns the same full
Reservation message used by mutations. Shared TypeScript types and the client
wrapper reflect these shapes; the old GetReservationResponse type is removed.
REST balance still returns its existing userId and three credit values.

The six order-only RPCs are GetBalance, ReserveCredits, UpdateReservation,
ReleaseCredits, SettleCredits, and GetReservation. The caller supplies
`x-credit-service-token` metadata. Credit derives service identity from its
configured secret using constant-time digest comparison. Missing/unknown or
multiple tokens yield `UNAUTHENTICATED`; a known unauthorized service yields
`PERMISSION_DENIED`. Only the order-service secret is configured at startup.

Set `CREDIT_ORDER_SERVICE_TOKEN` to the same secret on Credit and Order Service.
Outside explicit `CREDIT_LOCAL_MODE=true`, set both `CREDIT_TLS_CERT_PATH` and
`CREDIT_TLS_KEY_PATH` to readable TLS files. Deployments must mount/provide these
files; the local Compose example uses explicit local plaintext mode.

Business errors preserve gRPC codes and the `x-credit-error-reason` trailer:
ACCOUNT_NOT_FOUND, RESERVATION_NOT_FOUND, INSUFFICIENT_CREDITS, VERSION_CONFLICT,
INVALID_STATE, or REQUEST_CONFLICT. Invalid IDs/amounts fail before connecting to
the database. Order IDs must be lowercase hyphenated UUIDs. Amounts and expected
versions are positive int32 integers; IDs follow the human's length/whitespace/
control-character rules. Database serialization/deadlock/lock failures map to
ABORTED; connection failures map to UNAVAILABLE; unknown failures map to INTERNAL.
Only the dedicated ValidationError maps to INVALID_ARGUMENT (or REST 400).
Unexpected errors, including ordinary TypeError, return generic INTERNAL/500
messages and are logged with the original error on the server. Known business,
authentication and transient error mappings are preserved, as confirmed by the
human in exchange 025. The shared client preserves codes/trailers and deadlines;
automatic retries are not yet implemented.

## Frontend REST and user history

GET `/credits/me/balance` returns userId, totalCredits, reservedCredits, and
availableCredits. GET `/credits/me/history` accepts optional pageSize and
pageToken and returns entries and nextPageToken (null on the last page).
Responses use camelCase, string IDs, ISO UTC timestamps, integer credits, and
null optional links. History includes sequenceId as a decimal string.

Both routes require `Authorization: Bearer <user token>`. Credit verifies the
User Service RSA public key, RS256 only, a subject and an unexpired exp. The
subject selects the user; caller-supplied IDs or admin roles give no extra reach.
Errors have `{ error, message }` fields. Matching GET routes require authentication;
missing/invalid tokens return 401. Route matching happens first, so an unknown
path returns 404 even without a token. Known limitation: unsupported methods
currently return 404 rather than 405, with or without a token.
On matched routes, invalid sizes/bookmarks return 400; missing accounts return 404; transient
service failures return 503; internal failures return 500. Unknown users have
empty history, entries [] and nextPageToken null.

The REST listener runs on port 3004. Set CREDIT_JWT_PUBLIC_KEY_PATH to the User
Service public PEM. Local Compose mounts CREDIT_JWT_PUBLIC_KEY_FILE read-only
at /run/credit/user-service-public.pem, defaulting to ../user-service/keys/public.pem
relative to the Compose file. Supply that public file before starting; no private
User Service key is read, mounted, or packaged.

Both history RPCs, their messages/types, and client wrappers have been removed.
User history is REST-only; there is no order-history operation.

History storage/query support is implemented. Entries retain order_id and
reservation_id (nullable for initial grants), both signed deltas, and created_at.
Migration 006 adds an always-generated bigint sequence_id, unique sequence index,
`(user_id, sequence_id DESC)` index, and one INITIAL_GRANT per user via a partial
unique index. There is no order-history method/index. Queries page downward below
the sequence boundary; sequence values stay decimal strings in JavaScript.
Created_at is display-only: PostgreSQL [now()](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
uses transaction start. The human selected default page size 50, maximum 100,
base64url user/boundary tokens, and INVALID_ARGUMENT for invalid sizes/tokens.
Bookmarks encode UTF-8 JSON `{ userId, sequenceId }` as base64url. Decoding requires
exactly those two keys, the current subject as userId, and a positive decimal
sequence string without leading zeros, no greater than signed bigint max. Query
pageSize defaults to 50 and must be an integer from 1 to 100. Pages fetch one extra
row; later requests use sequence_id strictly below the last returned boundary.

## Local containers

From the repository root:

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml up -d --build
```

The example database password and service token are local development values.
For personal values pass an ignored env file; existing env files are unchanged.
The database is `credit_service`, user `credit_service`, at localhost:5433
(override CREDIT_POSTGRES_PORT), or postgres:5432 inside Compose. PostgreSQL 17
uses the named credit_service_pgdata volume at /var/lib/postgresql/data. The
[official image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md)
describes this path. Credit gRPC listens at localhost:50054.
Compose waits for database [service_healthy](https://docs.docker.com/compose/how-tos/startup-order/).
Only PostgreSQL and Credit are started; migrations are explicit.

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec postgres psql -U credit_service -d credit_service
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml down
```

The down command keeps the database volume.

## SQL migrations

Apply each file once, in order, using the transactional CLI. It has no migration
ledger or automatic skipping. The local development database has all six applied.
Migrations 001–005 were preserved. The human confirmed migration 006 has not
been applied to any shared database, so its update label was corrected in place
to RESERVATION_UPDATED in exchange 025. The already-migrated local database was
corrected transactionally by renaming the old label and replacing only its type
check; no sequence/index migration was rerun. Existing row data and indexes were
verified unchanged apart from the intended label. Historical prompt/log spelling
is preserved. Fresh databases use the corrected migration 006.

```sh
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/001_initial.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/002_align_credit_contract.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/003_uppercase_reservation_status.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/004_reservation_invariants.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/005_initial_grant_history_type.sql
docker compose --env-file credit-service/.env.docker.example -f credit-service/compose.yaml exec -T credit-service npm run db:migrate -- migrations/006_history_types_and_paging.sql
```

The CLI uses PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE; PGDATABASE must be explicit.
It uses one connection and transaction, following [node-postgres](https://node-postgres.com/features/transactions).
Migration 004 enforces unique order_id, settled iff courier is set, and distinct
participants. Migration 005 changes the initial label. Migration 006 converts all
remaining legacy labels, adds sequence paging and initial-grant uniqueness, and
replaces the type check with the six human-specified values. Invalid legacy data
causes a full rollback; it is not removed or silently repaired. Idempotency
operation_type values retain init_credits/reserve/update/release/transfer.

## Verification

```sh
npm run build
npm test
PGHOST=127.0.0.1 PGPORT=5433 PGUSER=credit_service PGPASSWORD=credit_service_local PGDATABASE=credit_service npm test --workspace @foc/credit-grpc
```

All 74 credit checks and eight shared gRPC checks passed, with no failures/skips.
Credit tests cover migration/default/FK constraints, initial allocation, account
and order concurrency, duplicate replay, no overspend, competing settle/release,
opposing settlements, full rollback after injected failures, history sequence
precision, writes during paging, late commits, service authorization, RS256
validation, TLS configuration, and reason trailers. Added regressions verify
ordinary service TypeError becomes a generic INTERNAL/500 and the actual error
is logged, unknown unauthenticated paths return 404, known unauthenticated GET
routes return 401, wrong methods retain the documented 404, and reserve retries
after update/release replay their saved snapshots while lookup returns current state. Integration tests use and
remove temporary schemas. Without PGDATABASE their database checks are skipped.

A scoped Node test-coverage run reported 98.29% lines and 94.44% branches for
services/repositories/messaging/api/controller source files before the layout move; startup/env/generated
code was outside that report. Docker rebuild/start and no-write runtime checks
for authentication, error trailers, UUID validation, and REST token rejection passed. These are agent
checks; human review remains pending.

## Attribution for JSON files

The human approved this attribution method for comment-free JSON in
[entry 005](ai/usage-log.md#005--confirm-column-rules-and-add-pg-migration-tooling).

| File | Tool, date, and scope | Author review |
| --- | --- | --- |
| credit-service/package.json | OpenAI Codex (GPT-6), 2026-10-20–2026-10-21: pg, migration/test scripts, @types/pg, jsonwebtoken and @types/jsonwebtoken; relocated the existing workspace manifest to the service root in exchange 024. | Pending human review. |
| Root package-lock.json | OpenAI Codex (GPT-6), 2026-10-20–2026-10-21: corresponding dependencies/transitive packages and relocated credit workspace/link metadata; earlier npm also normalized existing flags. | Pending human review. |
| Root package.json | OpenAI Codex (GPT-6), 2026-10-21: changed only the credit workspace path from credit-service/grpc to credit-service, using the recorded comment-free JSON attribution method. | Pending human review. |

Exact prompts/key exchanges and actual checks are archived under
[credit-service/ai/](ai/usage-log.md). The human authors remain responsible for
review, validation, team norms, licensing checks, and submission disclosure.
