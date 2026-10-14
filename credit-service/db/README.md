# Credit database schema

Credit Service owns the PostgreSQL `credit` schema. Other services use its internal
API instead of accessing these tables. User and order IDs are opaque text identifiers;
there are no foreign keys to another service's database.

| Table | Purpose | Keys and constraints |
| --- | --- | --- |
| `accounts` | Total and reserved balance per user | `user_id` primary key; balances non-negative; reserved cannot exceed total |
| `reservations` | One credit hold per order | UUID primary key; unique `order_id`; requester/courier reference accounts; positive amount/version |
| `history` | Append-only ledger of balance changes | Identity sequence for pagination; unique UUID; account/reservation references; only one initial grant per user |
| `idempotency_records` | Successful mutation response snapshots | Composite primary key `(operation, key)`; account identity, request hash, JSON response |
| `schema_migrations` | Applied migration checksums | Filename primary key; SHA-256 checksum and application time |

Available credits are calculated as `total_credits - reserved_credits`; they are not
stored separately. Accounts default to 10 total and 0 reserved credits. The future
initialisation operation must record the corresponding initial grant in the same
transaction. Creating the schema itself does not create accounts or grant credits.

Reservation statuses are `RESERVED`, `RELEASED`, and `SETTLED`. A settled reservation
must have a courier; other statuses must not. The courier must differ from the
requester. State transition rules and consistency between holds, balances, history,
and retry results are enforced by the core service's transaction logic, not by these
table constraints alone.

History stores signed `total_delta` and `reserved_delta`, plus order/reservation
references and timestamps. A database trigger rejects row updates and deletes.
The `(user_id, sequence_id DESC)` index supports newest-first user history; requester
reservations have their own index.

## Migrations

`migrate.cjs` creates the schema and migration tracking table, then applies SQL files
in filename order. All work is committed in one PostgreSQL transaction. An advisory
transaction lock prevents concurrent migration runners from applying the same files.
Repeated runs skip matching migrations. A changed checksum for an applied file fails
the transaction: add a new migration instead of editing an existing one.

- `001_core.sql` creates accounts, reservations, history, retry records, and indexes.
- `002_idempotency_user.sql` adds retry account identity, backfills it from existing
  saved responses, and makes it required.

Archive/restore storage and dispute adjustments are outside this infrastructure
change. The existing core API branch contains the behavioural implementation and
the detailed requirements reference.
