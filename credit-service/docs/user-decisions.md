<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Formatted the human's supplied requirements/design references and recorded unresolved details; no design decisions or rationales generated.
Author review: Pending human review.
Prompts and key responses: ../ai/usage-log.md, entries 003–012.
-->

# Human-supplied requirements and design

Received 2026-10-20 (Asia/Singapore). The supplied design is described by the
author as decisions “made so far” and a class diagram “thought of so far.”

- [Exact design/request text and diagram labels](../ai/prompts/003-requirements-and-setup.md).
- [Exact schema, table-scope, and persistence decisions](../ai/prompts/004-schema-decisions.md).
- [Exact column rules and attribution exception](../ai/prompts/005-column-rules-and-pg.md).
- [Exact history-delta names, defaults, and shorthand interpretation](../ai/prompts/006-history-deltas-and-defaults.md).
- [Exact shared-contract alignment request](../ai/prompts/007-align-credit-contract.md).
- [Exact uppercase-status confirmation and wider-RPC scope](../ai/prompts/008-status-casing-and-rpc-scope.md).
- [Exact human-decided RPC list](../ai/prompts/009-finalized-rpc-list.md).
- [Exact response shapes and internal-key clarification](../ai/prompts/010-response-shapes-and-internal-keys.md).
- [Exact initialization outcomes, history page fields, and deterministic-key flow](../ai/prompts/011-init-outcomes-and-deterministic-keys.md).
- [Exact initialization payload, duplicate replay outcome, and SHA-256 confirmation](../ai/prompts/012-init-payload-and-sha256.md).
- [Functional requirements supplied by the author](reference/functional-requirements.md).
- [Nonfunctional requirements supplied by the author](reference/nonfunctional-requirements.md).

The requirements are archived verbatim, including their existing priorities and
planned sprints. Those values were supplied by the human and were not selected,
reprioritized, or consolidated by AI.

## Supplied decisions

- Credit-service database: PostgreSQL 17.
- Final table list, confirmed by the human: `credit_accounts`, `reservations`,
  `credit_history`, `archived_balances`, `idempotency_records`.
- Current schema scope: `credit_accounts`, `reservations`, `credit_history`, and
  `idempotency_records`. The human explicitly deferred `archived_balances` because
  User Service has not implemented archival yet.
- Persistence: `pg`; migrations: SQL.
- Diagram call flow: User Service, Order Service, and Frontend/Client call
  Credit Controller; Credit Controller calls Credit Service; Credit Service calls
  Credit Repository; Credit Repository calls the SQL Database.
- Classes supplied: `CreditService`, `CreditController`, `CreditRepository`,
  `SqlCreditRepository` (implements `CreditRepository`), `CreditAccount`,
  `Reservation`, `CreditHistoryEntry`, `ArchivedBalance`, `IdempotencyRecord`.
- `CreditAccount.initAccount()` allocates 10 credits upon registration.

The exact attributes and method names, including the author's original spelling,
are retained in the linked prompt archive.

## Supplied column specifications

The replies use `accounts` and `history` as shorthand; the confirmed table names
above are retained. The first migration implements these supplied specifications.

| Table | Human-supplied specification |
| --- | --- |
| `credit_accounts` | `user_id`: text primary key supplied by application/User Service. `total_credits`: integer supplied by application. `reserved_credits`: integer, default `0`. `created_at`, `updated_at`: timestamps with time zone, default `now()`. All columns NOT NULL. Checks: total ≥ 0; reserved ≥ 0; reserved ≤ total. Available balance is computed, never stored. Initial 10 credits are allocated by application during registration. |
| `reservations` | `reservation_id`: UUID primary key, default `gen_random_uuid()`. `order_id`: UUID, logical Order Service reference. `requester_id`, `courier_id`: text FKs to `credit_accounts.user_id`. `credit_amount`: integer. `status`: restricted text, default `RESERVED`. `version`: integer, application-supplied. `created_at`, `updated_at`: timestamps with time zone, default `now()`. All columns NOT NULL except `courier_id`, which defaults to NULL and is populated when Order Service requests a transfer after completion. |
| `credit_history` | `id`: UUID primary key, default `gen_random_uuid()`. `user_id`: text FK to `credit_accounts.user_id`. `reservation_id`: UUID FK to `reservations.reservation_id`. `order_id`: UUID logical Order Service reference, no FK. `type`: restricted text. `total_amount_change`, `total_reserved_change`: signed integers, with negative values permitted. `created_at`: timestamp with time zone, default `now()`. Only `order_id` and `reservation_id` may be NULL, including for initial allocations. There is no `amount`, `total_amount`, or `reserved_amount` column. |
| `idempotency_records` | Composite primary key: `operation_type` (text), `idempotency_key` (text). `user_id`: text, logical account relationship, no FK. `request_hash`: text. `result`: JSONB. `created_at`: timestamp with time zone, default `now()`. All columns NOT NULL; all values other than `created_at` are supplied by application. |

Allowed SQL reservation statuses and proto enum labels: `RESERVED`, `RELEASED`,
`SETTLED`. The old `transferred` status is converted by migration 002. The human
confirmed uppercase statuses everywhere in exchange 008, implemented by
migration 003 for existing lowercase values and the default.

Allowed history types and current idempotency operation types: `init_credits`,
`reserve`, `update`, `release`, `transfer`. Archive and restore types are deferred.

Order IDs are supplied by Order Service when it calls the exposed API methods.
No orders table or order foreign key is to be created in this database.

## Human-specified idempotency flow

- A key is unique per operation type. The human's latest decision recomputes it
  deterministically from request fields on every call, so the same request finds
  the same record. Callers do not supply keys and no random key is generated.
  The human confirmed the algorithm is SHA-256 in exchange 012.
- Within the credit-change transaction, take a lock on `(operation_type, key)`
  and look up an existing record. No concrete lock mechanism is implemented yet.
- If a record exists, compare the request hash. Matching hashes return the
  original stored response; mismatches are rejected.
- If no record exists, perform the operation and atomically save its record/result.
- Failed operations roll back, leaving no record; a retry runs the operation again.

The existing schema stores the key as part of the idempotency-record primary
key; the service recomputes the lookup value for each request rather than
retrieving a key for a caller to reuse. Under the human's original-response rule,
replay returns that earlier operation's result even after later state changes.
The already-decided `GetReservation` read supplies current reservation state
once implemented. This explanation is illustrated by
[Stripe API v1 original-response replay](https://docs.stripe.com/api/idempotent_requests);
no other Stripe policies are adopted. The human explicitly confirmed that
duplicate initialization also returns its original saved success without
granting credits again, replacing the earlier already-allocated-result idea.

## Schema implementation

[001_initial.sql](../migrations/001_initial.sql) implements the four current tables
from the human's decisions in exchanges 004–006. The latest shorthand about
reserved credits and repeated timestamp defaults is mapped to the previously
specified columns as recorded in exchange 006; it does not add reservation
`user_id` or `amount` columns.

[002_align_credit_contract.sql](../migrations/002_align_credit_contract.sql)
implements the later human-requested `requester_id` and terminal `SETTLED`
changes without rewriting migration 001. Current shared message fields and the
current RPC scope are documented in [the shared gRPC README](../../shared/grpc/README.md#credit-contract-alignment).

[003_uppercase_reservation_status.sql](../migrations/003_uppercase_reservation_status.sql)
implements the human's uppercase-status confirmation. The human subsequently
provided and finalized the nine-method contract below in exchanges 009–012.

## Human-decided RPC list

The following is formatted from exchange 009, in the author's supplied order.
External `amount` maps to the existing SQL `credit_amount` column. Proto fields
use snake_case and the existing loader exposes camelCase JavaScript names.

| RPC | Supplied request fields | Supplied response or behavior |
| --- | --- | --- |
| `InitCredits` | `user_id` | Returns exactly user_id, total_credits, reserved_credits, available_credits. Grants 10 credits only once at first registration, with original-success replay on duplicate calls and no further grant. Must handle failed/delayed initialization after User Service registration and avoid another initial grant on future restoration. |
| `GetBalance` | `userId` | Exactly total, reserved, and available credits; no user ID/timestamps. |
| `GetUserCreditHistory` | `userId`, optional `pageSize`, `pageToken` | Newest-first, paginated `CreditHistoryPage` with `entries` and `next_page_token`; each entry contains all history-table fields. |
| `GetOrderCreditHistory` | `orderId`, optional `pageSize`, `pageToken` | The same `CreditHistoryPage` and entry message, filtered by order. |
| `ReserveCredits` | `orderId`, `requesterId`, `amount` | Reservation's orderId, requesterId, amount, status, nullable courierId, reservationId, and version. |
| `UpdateReservation` | `orderId`, `amount`, `expectedVersion` | Same seven-field reservation response. |
| `ReleaseCredits` | `orderId` | Releases an active hold without increasing total credits; same seven-field reservation response. |
| `SettleCredits` | `orderId`, `courierId` | Transfers held amount from requester to courier; same seven-field reservation response. |
| `GetReservation` | `orderId` | Read-only response containing exactly status, amount, and version. |

No caller idempotency key is present in the latest request signatures. All nine
fully defined RPC declarations, including initialization, reservation, and history, have
unimplemented handlers and Promise client wrappers. `CreditHistoryEntry` contains
all eight table fields, with nullable order/reservation IDs and signed deltas.
The final initialization payload and SHA-256 confirmation are implemented in the
contract and documented. No boolean/status fields or new application error-code
mapping were invented. Concrete pagination/locking details remain for the human
to specify before dependent business implementation; no allocation, hashing,
locking, or database query behavior is implemented by the contract scaffolds.

Timestamp defaults initialize inserted rows. They do not automatically refresh
`updated_at` when a row is updated; application updates must supply that value.
The initial allocation is application behavior, not a database default of 10.
Archive/restore and service/repository/domain implementation remain outside this
schema step.

## Approved JSON attribution exception

The human approved documenting attribution for `credit-service/grpc/package.json`
and root `package-lock.json` in the service README and usage log instead of
file-header comments. The exact approval is archived in exchange 005.
