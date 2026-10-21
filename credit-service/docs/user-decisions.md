<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
Scope: Formatted the human's supplied requirements/design references and recorded unresolved details; no design decisions or rationales generated.
Author review: Pending human review.
Prompts and key responses: ../ai/usage-log.md, entries 003–012, 014–026 and 028.
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
- [Exact business behaviour, access rules, hashing, transactions, and implementation design](../ai/prompts/014-business-rules-and-implementation-design.md).
- [Proposed userCreated-triggered initialization](../ai/prompts/015-proposed-user-created-initialization.md).
- [Confirmed event initialization scope and delivery behaviour](../ai/prompts/016-user-created-event-contract.md).
- [Credit-side-first implementation and inconsistent-account failure](../ai/prompts/017-consumer-first-and-permanent-failure.md).
- [INITIAL_GRANT, bounded failure retries, and PostgreSQL advisory locks](../ai/prompts/018-initial-grant-and-advisory-locks.md).
- [Exact namespace/key advisory-lock encoding](../ai/prompts/019-advisory-lock-key-encoding.md).
- [Remaining core business logic and teammate integration ownership](../ai/prompts/020-remaining-core-business-logic.md).
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
- The original class sketch placed allocation in `CreditAccount.initAccount()`.
  Exchange 014 supersedes that placement: entities hold data only and business
  rules live in `CreditService`.

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

Current history types after migration 005: `INITIAL_GRANT`, `reserve`, `update`,
`release`, `transfer`. Idempotency operation types remain `init_credits`,
`reserve`, `update`, `release`, `transfer`. Archive and restore types are deferred.

Order IDs are supplied by Order Service when it calls the exposed API methods.
No orders table or order foreign key is to be created in this database.

## Human-specified idempotency flow

- A key is unique per operation type. Exchange 014 separates the deterministic
  lookup key from the SHA-256 request hash: Init uses plain `userId`;
  Reserve/Release/Settle use plain `orderId`; Update uses the JSON array
  `[orderId, expectedVersion]`. Callers do not supply keys and no random key is
  generated. A changed request under the same operation/key is rejected.
- Within the credit-change transaction, take a lock on `(operation_type, key)`
  and look up an existing record. Exchange 018 selects pg_advisory_xact_lock(bigint);
  SqlCreditRepository implements it. Exchange 019 supplies the exact encoding below.
- If a record exists, compare the request hash. Matching hashes return the
  original stored response; mismatches are rejected.
- If no record exists, perform the operation and atomically save its record/result.
- Failed operations roll back, leaving no record; a retry runs the operation again.

Exchange 014 specifies SHA-256 over the UTF-8 JSON array of validated fields,
yielding a lowercase 64-character hexadecimal digest:

| Operation | Hash input |
| --- | --- |
| Init | `["INIT", userId]` |
| Reserve | `["RESERVE", orderId, requesterId, amount]` |
| Update | `["UPDATE", orderId, amount, expectedVersion]` |
| Release | `["RELEASE", orderId]` |
| Settle | `["SETTLE", orderId, courierId]` |

IDs are compared exactly, without normalization. Caller identity, timestamps,
metadata, and raw-object property order are excluded. Successful records remain
while their account exists. The service owns the transaction and passes its
connection to SqlCreditRepository. Exchange 019 supplies and implements the exact
namespace/key-to-bigint encoding.

### Human-finalized advisory-lock encoding — exchange 019

- Lock text: JSON of the two-element array [namespace, key], both strings,
  implemented with JSON.stringify.
- Hash: SHA-256 of that text's UTF-8 bytes.
- Lock integer: first eight digest bytes interpreted as a big-endian signed
  64-bit integer.
- SQL argument: decimal string passed to pg_advisory_xact_lock($1::bigint).

The repository uses the shared implementation of this definition. CreditService
and SqlCreditRepository no longer accept an injected encoder. Namespace values
remain init_credits for initialization retry locks and account for account locks.

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

## Original human-decided RPC list — initialization superseded by exchange 016

The following records exchange 009 in the author's supplied order.
Exchange 016 removes InitCredits entirely; the other eight RPCs remain.
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

No caller idempotency key is present in the latest request signatures. The eight
remaining RPC declarations have unimplemented handlers and Promise client wrappers.
InitCredits and its messages/types/wrapper/handler were removed in exchange 016.
`CreditHistoryEntry` contains
all eight table fields, with nullable order/reservation IDs and signed deltas.
The SHA-256 definition remains documented; initialization is now event-triggered,
with no gRPC request/response. No boolean/status fields or new application
error-code mapping were invented. Concrete pagination/locking details remain for the human
to specify before dependent business implementation; no allocation, hashing,
locking, or database query behavior is implemented by the contract scaffolds.
The separate initial-allocation service/repository slice added in exchange 018
implements these operations for user.created; the gRPC handlers remain stubs.

Timestamp defaults initialize inserted rows. They do not automatically refresh
`updated_at` when a row is updated; application updates must supply that value.
The initial allocation is application behavior, not a database default of 10.
Archive/restore and service/repository/domain implementation remain outside this
schema step.

## Business behaviour and implementation definitions — exchange 014

The following records the human's supplied decisions. It does not select answers
to the outstanding questions in the linked exchange.

| Function | Supplied behaviour |
| --- | --- |
| Init | Replay saved success first. Otherwise create an account with total 10, reserved 0, initial history, and the successful retry result in one transaction. An existing account without a saved result returns ALREADY_EXISTS with no writes. |
| Balance | Missing/uninitialized account returns NOT_FOUND; reads never create an account. |
| Reserve | One reservation per order for its lifetime, enforced by UNIQUE(order_id). No re-reservation after release. A changed requester/amount fails; amount changes use Update. New reservation version is 1. |
| Update | Amount replaces the total hold. Check saved result, existence, RESERVED status, expected version, changed amount, then available credits for an increase. Apply the difference to reserved credits. Unchanged amount is rejected without history or version change. |
| Release | Missing reservation returns NOT_FOUND; SETTLED fails. RESERVED decreases reserved credits without changing total, sets RELEASED, and increments version. Already RELEASED without a saved result returns current reservation without changes. |
| Settle | Missing reservation/account returns NOT_FOUND; missing courier account is named in the message. RELEASED fails with INVALID_STATE. For RESERVED, courier must differ from requester and have an account; Order Service verifies assignment. Debit requester total and reserved equally, credit courier total, set courier and SETTLED, append both sides' history, and save result atomically. Saved results replay first. Without a saved result, SETTLED with the same courier returns the current reservation without writes or a replacement retry record; a different courier fails with FAILED_PRECONDITION/REQUEST_CONFLICT, as finalized in [exchange 028](../ai/prompts/028-settlement-retry-fallback.md). |
| Reservation read | Missing reservation returns NOT_FOUND; no changes. |
| History reads | Default page size 50, maximum 100. Invalid sizes/tokens return INVALID_ARGUMENT. Sort newest first by timestamp, then id. Unknown user returns empty entries/token. Later pages exclude entries added after page one. Exact cursor/snapshot mechanism remains unspecified. |

Each successful update, release, or settlement increments version by one.
Failures and replay do not change version or append duplicate history.
The human removed disputes, including F8.9.2, from scope; no replacement admin
adjustment API is to be inferred.

### Validation and errors supplied by the human

- Amounts are whole numbers at least 1. Missing amounts read as zero and fail.
  Expected version is at least 1.
- IDs are nonempty, at most 128 characters, without leading/trailing whitespace
  or control characters, and are not normalized. Existing order columns use
  UUID; UUID-specific request validation remains a clarification question.
- Bad input/pagination: INVALID_ARGUMENT. Missing account/reservation: NOT_FOUND.
  Insufficient credits, version conflicts, invalid transitions, and mismatched
  request hashes for the same key: FAILED_PRECONDITION.
- Existing initialization account without saved result: ALREADY_EXISTS.
  Transient failures: UNAVAILABLE, ABORTED, DEADLINE_EXCEEDED. Bugs: INTERNAL.
- Controller-produced errors carry a short reason in trailing metadata.
  VERSION_CONFLICT is specified; the metadata key and remaining reason values
  and caller-authentication error codes are not yet specified.

### Supplied layers, locking, and transaction ownership

CreditController checks service identity before business logic and maps errors.
It never opens a transaction. CreditService owns one READ COMMITTED transaction
per mutating RPC. SqlCreditRepository implements CreditRepository, uses the
current transaction, and never commits or rolls back. Entities hold data only.
Reads use one query or a short transaction without explicit locks.

Mutations lock (1) retry key, (2) order resource, or account resource for Init,
then (3) account rows in ascending user-ID order. Account rows use SELECT FOR
UPDATE. Relevant state is read after acquiring the locks. Concrete resource-lock
SQL and transaction connection binding have not been supplied. Order resources
are locked for both settlement and release.

The supplied repository operations are lockKey, idempotency find/save, account
find/lock/create/save, reservation find/create/save, appendHistory, and history
queries by user/order. Their exact supplied names/signatures are archived in
exchange 014. The beforeSequenceId parameter has no corresponding column in the
current UUID-based history schema; it remains an unanswered interface question.

### Supplied access and retry integration

- Init: User Service.
- GetBalance: User Service or Order Service.
- Reserve/Update/Release/Settle/GetReservation: Order Service.
- Order history: admin users only. The permitted calling service and how admin
  identity is verified/forwarded are not yet defined.
- The GetUserCreditHistory caller/user permission rule is not yet supplied.
- The human asked about JWT/RBAC checks at the edge or in User Service. No choice
  of enforcement layer or authenticated service-identity mechanism was selected.
  Existing User Service HTTP middleware verifies JWTs; the gRPC scaffold defaults
  to insecure credentials. See [gRPC authentication](https://grpc.io/docs/guides/auth/).

After main business logic, the human requested identical-request retries in
createCreditClient only for UNAVAILABLE, ABORTED, and DEADLINE_EXCEEDED.
Attempt limits, backoff/deadline budgets, and any configuration interface remain
unspecified for that later implementation.

Order Service creates/saves a stable order ID before reserving, reuses it on
retries, publishes only after confirmation, and recovers unpublished orders by
retrying or releasing. Those Order Service operations are recorded, not
implemented in this credit-service change.

The supplied ambiguous-failure statement needs this technical qualification:
GetReservation NOT_FOUND establishes that no committed reservation was visible
to that read. It does not prove an earlier in-flight request cannot later commit.
This follows from [READ COMMITTED visibility](https://www.postgresql.org/docs/17/transaction-iso.html)
and [gRPC deadline/cancellation behaviour](https://grpc.io/docs/guides/deadlines/).
Likewise, a response/transport failure after a database commit cannot roll back
that completed commit; transaction failures before commit roll back their writes.

### Current implementation and unresolved definitions

[004_reservation_invariants.sql](../migrations/004_reservation_invariants.sql)
adds exactly the explicit UNIQUE(order_id), SETTLED iff courier_id is set, and
courier != requester constraints. It does not rewrite earlier migrations or
repair pre-existing invalid data.

Exchange 018 confirms INITIAL_GRANT and migration 005 replaces the original
init_credits history label. TRANSFER_OUT/TRANSFER_IN/RELEASED remain unconfirmed
for the other operations; their existing lowercase history values are retained.
The existing idempotency operation values have not been changed.

The initial-grant and append-only requirements are recorded. Any additional
database enforcement mechanism beyond the existing account primary key remains
for the human to specify. The Reserve missing-retry-record fallback also needs
confirmation: existing-state response versus original-success replay, and which
reservation statuses qualify.

The human requested concurrency tests for parallel reserves without overspend,
settle/release races, duplicate requests, and opposing settlements without
deadlock. These require business implementation and are not covered by the
current migration tests.

## Proposed event-triggered initialization — exchange 015

The human reports discussing an event-based workflow with User Service and says
they are considering it: User Service publishes userCreated, and Credit Service
initializes the account with 10 credits from that event.

This was recorded as a proposal at the time of exchange 015. It is superseded
by the human's confirmed scope and delivery rules in exchange 016 below.

The already-supplied atomicity, one-time allocation, duplicate-processing, and
missing-account read rules remain recorded. Final event transport/payload,
publication and processing failure behaviour, acknowledgment timing, complete
RPC replacement scope, and first-registration/restoration distinction are for
the human and User Service team to finalize before dependent implementation.
These were the open questions at exchange 015, not a statement of current scope.

## Confirmed userCreated initialization — exchange 016

- Transport: RabbitMQ through the shared messaging package in PR 57.
- Event payload: type = user.created, eventId, occurredAt, userId. The human
  references the User Service implementation for exact validation details.
- User Service publishes after registration and owns publication/republication.
  Credit Service performs allocation after delivery.
- Acknowledge after the database transaction commits, or after confirming the
  initial grant already exists. Database/lock failures use shared-client retries
  up to its limit.
- Grant 10 credits exactly once per userId, including when multiple events have
  different eventIds for the same user. User Service distinguishes registration
  from restoration. For current scope user.created means a new userId; reusing
  that userId must never cause a second grant.
- Replace the entire InitCredits RPC. The proto messages, generated types,
  client wrapper, and stub have been removed; the eight other RPCs remain.
- Exchanges 017–018 implement the callback and initial-allocation transaction.
  No new eventId-based deduplication schema or change to the existing
  initialization operation/key is inferred.

Read-only inspection of
[PR 57](https://github.com/AY2627S1-CS3219-P22/FoC/pull/57) at commit
b8b924db95a60a36f9bc6b8c1880bf5ae96fb939 verified the shared RabbitMQClient API:
consumeFromQueue awaits the handler and acknowledges its successful completion;
a rejected handler uses bounded republishing and then dead-lettering.
MAX_RETRIES currently defaults to 3. This is the messaging client's retry
mechanism, separate from the previously requested gRPC client retries.

That PR snapshot contains no user.created contract, queue constant, or User
Service publisher. The package is also absent from this working branch.
The human subsequently confirms the publisher is not implemented and directs
credit-side implementation first. No publisher implementation is required for
the callback/transaction tests; the eventual queue is supplied at registration.
No PR was checked out, merged, or copied into this branch.

The human resolves the existing-account case in exchanges 017–018: without
initial-grant history or saved allocation evidence, fail permanently with no
writes and no successful delivery completion. Use the shared client's bounded
retry-then-dead-letter path; no new permanent-error API is required.

## Initial-allocation implementation — exchanges 017–018

Implemented user.created callback/registration and the initial-allocation slice
of CreditService/CreditRepository/SqlCreditRepository. Business rules remain in
CreditService; repository methods run on its pg connection and do not commit or
roll back. The service locks retry resource init_credits/userId, checks saved
success/hash, then locks account/userId and the existing account row if needed.

For a new user, account total/reserved = 10/0, INITIAL_GRANT changes = +10/0,
and saved result commit together. Saved result replays without writes. If there
is only a confirmed INITIAL_GRANT row, the service returns the account's current
computed balance without adding a result/history row. An account lacking that
evidence fails with ALREADY_EXISTS and no writes. A matching history grant must
have the supplied +10/0 initial deltas. Prior confirmed grants are logged after
the transaction completes. A mismatched saved hash fails with FAILED_PRECONDITION.

The callback validates the event type, string envelope fields, and the supplied
user-ID rules, passes only userId to initialization, awaits its result, and
propagates failures unchanged. The shared client owns delivery acknowledgment
and bounded retries/dead-lettering. Callback registration accepts a connected
shared client plus an externally supplied queue; the publisher and package are
not copied or merged into this branch. RabbitMQ startup is not wired into the
application entrypoint.

The human-selected pg_advisory_xact_lock(bigint) is verified in the
[PostgreSQL 17 function reference](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS).
The [lock-lifetime documentation](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS)
confirms automatic release at transaction end. SqlCreditRepository passes its
bigint argument as a string parameter with an explicit bigint SQL cast.
Exchange 019 replaces the temporary injected encoder with the human's finalized
namespace/string-to-bigint mapping. The service takes only its pool and the
repository only its transaction connection. Tests use the production encoder,
including known positive and negative decimal lock identifiers independently
computed with Python hashlib/struct.

Migration 005 updates existing initial history labels to INITIAL_GRANT and
preserves the remaining type values. It is applied to the local development
database. @types/pg is now a declared credit-service development dependency.

All 33 credit checks passed against PostgreSQL 17. They cover callback completion,
user-based inputs across different events, 24 parallel deliveries with one grant,
saved replay after changed balances, no-write inconsistent accounts, rollback of
history/result insertion failures, subsequent retry, real lock timeout/retry, and
advisory-lock release after both commit and rollback. Live RabbitMQ acknowledgments
and dead-letter routing are not tested or running. Encoding checks also cover
UTF-8/JSON escaping, signed 64-bit precision, tuple boundaries, and rejection of
non-string namespace/key values without coercion.

## Core credit logic and teammate integration ownership — exchange 020

The human explicitly assigns RabbitMQ startup wiring and User Service
implementation to teammates and requests the remaining credit-side business
logic. Those integrations are not part of this task.

Implemented getBalance, getReservation, and updateReservation at service level,
plus the needed SQL account/reservation writes and shared transaction/replay
handling. Update uses the existing confirmed lowercase update history value
until the full history-name clarification is answered. It applies only the
amount difference, checks an increase against available balance, increments
version exactly once, appends history and saves the retry result atomically.
Matching saved success is replayed before state/version checks. Unchanged
amount, stale version, inactive/missing reservation, and insufficient available
credits leave all state unchanged.

The gRPC controller is not wired while authenticated service identity, history
permissions, and error metadata remain unspecified. No controller security
mechanism or new reason strings were generated. Existing VERSION_CONFLICT is
retained for stale versions. UUID-specific validation and missing-retry-record
Reserve fallback remain explicit questions. The cursor/snapshot mechanism and
full remaining history type list are also still questions, not selected designs.

All 44 credit checks passed, including 11 core read/update/validation/concurrency/
rollback checks. No migration or persisted application data change was needed.
Reserve/release/settle and paginated history implementation remain pending the
recorded human definitions; this is not a completed implementation of all core
operations.

## Final history, fallback and access definitions — exchange 021

This exchange supersedes earlier order-history, timestamp/id ordering, history
label, and caller-permission definitions. The exact human answers are archived
in [exchange 021](../ai/prompts/021-history-and-authentication.md).

History types are INITIAL_GRANT, RESERVED, RESERVARTION_UPDATED, RELEASED,
TRANSFER_OUT, TRANSFER_IN. The human's exact RESERVARTION_UPDATED spelling is
retained. Migration 006 converts legacy labels and replaces the type check in
one new migration, adds sequence_id bigint GENERATED ALWAYS AS IDENTITY, a unique
sequence index, (user_id, sequence_id DESC), and a partial unique user index for
INITIAL_GRANT. Previously applied migrations remain unchanged. Order IDs remain
on reservation-related history rows; initial grants keep nullable order/reservation
links. The order-history operation and order-based paging index are removed.

Sequence defines newest-first ordering; created_at is display-only. Each history
insert occurs under the corresponding account lock held through commit. Pages
select below the previous sequence boundary, fetching one extra row. Default size
is 50, maximum 100. A wrong-scope or malformed token/size is invalid argument.
Unknown users return empty history. Writes/late commits after the first page are
excluded by subsequent downward boundaries under the supplied locking rule.

Reserve without a saved retry result returns an existing matching requester and
amount in any current status, without writes or a new retry result. Different
requester/amount fails FAILED_PRECONDITION/REQUEST_CONFLICT, including an original
reserve request whose amount has since changed. Saved results still replay first.
Order IDs must be lowercase hyphenated UUIDs, validated before a transaction.

Only Order Service calls Credit gRPC. It sends its own secret in
x-credit-service-token; identity is determined by the matching configured secret,
compared in constant time. Missing/unknown secrets are UNAUTHENTICATED and known
unauthorized services are PERMISSION_DENIED. TLS is required outside local use.
The six allowed RPCs are reserve/update/release/settle/get reservation/get balance.
User Service communicates through events. Neither history operation is gRPC.

Frontend REST on port 3004 provides balance and the caller's own history. Credit
verifies User Service's RSA public key, RS256 only, subject present and token
unexpired. The subject is the user selector; admins have no additional reach.
The error trailer x-credit-error-reason has ACCOUNT_NOT_FOUND,
RESERVATION_NOT_FOUND, INSUFFICIENT_CREDITS, VERSION_CONFLICT, INVALID_STATE,
REQUEST_CONFLICT. The controller authenticates before business logic and maps
service errors; CreditService still owns mutations' transaction boundaries.

## Final REST wire definitions — exchange 022

The [human's exact answer](../ai/prompts/022-rest-wire-details.md) defines:

- GET /credits/me/balance -> userId, totalCredits, reservedCredits, availableCredits.
- GET /credits/me/history with optional pageSize/pageToken -> entries, nextPageToken.
  The token is null on the last page.
- JSON uses camelCase, string IDs, ISO UTC timestamps, integer credits, null
  optional fields, and errors containing error/message.
- Each history entry includes the table fields, with sequenceId as a decimal string.
- Bookmarks are base64url UTF-8 JSON objects with exactly userId and sequenceId.
  userId equals the caller; sequenceId is a positive digits-only decimal string
  without leading zeros, within the signed 64-bit range.

Both REST routes and service history paging are implemented. Token user identity
cannot be overridden by query parameters or admin roles. All 70 credit checks and
eight shared checks pass; local Docker exposes authenticated REST/gRPC. RabbitMQ
startup and User Service publisher remain assigned to teammates. Shared client
application retry behaviour has not yet been implemented; it still preserves
finite deadlines and errors.

## Human-finalized source placement — exchange 024

The exact request is archived in [exchange 024](../ai/prompts/024-service-src-layout.md).
Source is under credit-service/src with domains, repos, services, grpc, rest,
events, env.ts and index.ts. Package files, test and scripts were relocated to
the credit-service root alongside existing migrations/docs/AI records. Existing
entity types moved from CreditRepository into domains/types.ts, SQL repository
files into repos, and messaging callback into events. The existing authentication
functions moved into the corresponding grpc/rest folders. Runtime interfaces,
SQL schema, transaction ownership and authentication rules are unchanged.
The npm package identifier remains @foc/credit-grpc; the workspace path is now
credit-service. Documentation, test imports, Docker COPY/working directory and
public-key relative paths were updated. The shared transport test now resolves
credit-service/dist/grpc/server.js. The Supplier Dockerfile's credit manifest
COPY path was updated for the same workspace relocation.

## Human corrections to spelling, errors and REST routing — exchange 025

The [exact request and confirmations](../ai/prompts/025-validation-routing-and-spelling.md)
supersede the earlier spelling and TypeError/routing behavior:

- History update type is RESERVATION_UPDATED. The human confirms migration 006
  has not been applied to any shared database; it is edited in place. Local
  migration 006 had already run, so only the existing type label/check were
  corrected transactionally. No identity column/index change was repeated.
- Deliberate input validation throws ValidationError. Only that type maps to
  INVALID_ARGUMENT/400. Unexpected errors, including ordinary TypeError, map
  to generic INTERNAL/500 and the original error is logged server-side. The
  human confirms existing business/authentication/transient mappings remain.
- Mutation replies represent the state immediately after that operation;
  matching retries replay saved snapshots even after subsequent state changes.
  GetReservation provides the current status, amount and version. Previously
  defined fallbacks without a saved result are unchanged.
- REST matches routes before authentication: unknown unauthenticated paths
  return 404; known GET routes without a token return 401. Unsupported methods
  continue to return 404, recorded as the requested known limitation with tests.

All 74 credit tests, eight shared checks, workspace build and local Docker
rebuild/runtime checks pass. Historical prompts/logs retain the original typo.

## Human-expanded read responses — exchange 026

The [exact request](../ai/prompts/026-expanded-read-responses.md) supersedes earlier
three-balance-only and three-field-reservation RPC response definitions.
Balance restores string user_id at protobuf field 1, and CreditService.getBalance
returns userId with totalCredits, reservedCredits and availableCredits.
GetReservation returns the existing full Reservation message used by mutations:
orderId, requesterId, amount, status, optional courierId, reservationId, version.
The gRPC controller forwards the service result without the former projection;
the separate GetReservationResponse message/generated type is removed. Current
state is still read without writes, and saved mutation replies remain snapshots.

Types/client wrappers were regenerated/updated. REST forwards the four-field
balance returned by the service. Internal event-initialization result typing uses
Omit<Balance, 'userId'> to preserve its existing three-credit result and stored
allocation replies. No initialization payload, saved response, SQL schema or
migration was changed by this read-contract update.

## Approved JSON attribution exception

The human approved documenting attribution for `credit-service/grpc/package.json`
(relocated to `credit-service/package.json` in exchange 024) and root `package-lock.json` in the service README and usage log instead of
file-header comments. The exact approval is archived in exchange 005.
