# Credit requirements and integration responsibilities

Reference: the team's functional/non-functional requirement sheets supplied on
12 October 2026. Apply these requirements alongside [the class diagram](class-diagram.md).
The mappings below describe the current implementation; they do not certify
system-level compliance, performance, deployment, or security targets.

## Functional requirements

| Requirement | Current implementation | Remaining work / owner |
| --- | --- | --- |
| F8.1, F8.1.2: non-negative balances | Account constraints, available-balance checks, account locks, and atomic mutations protect core operations | Apply these invariants to archive/restore and disputes too |
| F8.1.1: 10 initial credits on registration | `InitCredits` grants 10 once per user ID | User Service must call it after successful registration, with reliable retries |
| F8.2.1–F8.2.2: balance breakdown and transfer history | Balance/history RPCs exist | Authenticated backend adapter and frontend display |
| F8.2.3: reservation history | Creation, update, release, and transfer record signed amounts/deltas, timestamps, and errand references | Add audit entries for remaining operations |
| F8.3.1–F8.3.3: reservation excludes reuse; check/reserve atomic | Implemented in `ReserveCredits` | Order Service must publish/create a successful errand only after reservation is confirmed (F6.2.5–F6.2.7, N3.3) |
| F8.4.1–F8.4.3: atomic reservation replacement or unchanged on failure | `UpdateReservation` checks and applies the amount delta atomically; stale versions are rejected | Order Service must call this single RPC and coordinate edits/acceptance (F6.3.1–F6.3.4) |
| F8.5.1–F8.5.2: transfer once after courier confirmation | `SettleCredits` atomically transfers an active reservation once | Order Service validates assigned courier and delivery/completion state (F7.5.4, F7.6.1) |
| F8.6.1–F8.6.2: release on pre-acceptance cancellation/expiry | `ReleaseCredits` removes the hold once | Order Service validates state, triggers expiry, and coordinates acceptance races (F6.4, F7.6.2) |
| F8.6.3: release if an accepted errand misses its delivery deadline | Release primitive exists, without order/deadline knowledge | Order Service needs a reliable deadline trigger and coordination with completion |
| F8.7.1: archive only without active errands | Not implemented | User/Order services check deletion eligibility; Credit also checks outstanding holds before archive |
| F8.7.2, F2.7.3–F2.7.4: archive email/credits and restore matching email within 4 years | Not implemented | Archive persistence, retention/cleanup, verified email matching and restore operation; coordinate with User Service |
| F8.8.1–F8.8.2: transfers/releases at most once and atomic | Core operations implemented and tested | Confirmed: prevent duplicate effects; replay the original response or report already processed |
| F8.9.1–F8.9.2: admin dispute adjustment using an existing hold, or reserving/transferring when no hold exists | Not implemented | Credit adjustment flow and audit records; Admin verifies resolved dispute and authorisation (F12.4) |

Archived-user work under F8.7 and F2.7.3–F2.7.4 is deferred at the user's request
until User Service implements its deletion/archive lifecycle. This includes archive
storage, credit archive/restore, archive retention/encryption and their integration.
The confirmed restore rule remains: restore the archived balance without a new
10-credit grant. Disputes remain deferred until last.

User deletion eligibility includes active/uncompleted errands, open requests, and
unresolved disputes involving the user as either requester or courier, even if the
other participant raised the dispute (F2.7.5). A zero reserved balance alone is
insufficient to establish deletion eligibility. Credit Service does not currently
know these Order/Admin states.

## Integration hand-offs

### User Service

Use the shared credit client and actual registered user ID. Connect initialisation
to registration, and implement recoverable pending work/retries when a downstream
call fails. Archive/restore integration is deferred until User Service's lifecycle
is ready and the corresponding credit contracts are implemented.
Use the deletion checks above and the four-year restore rule. Do not claim archive
support from the current `InitCredits` endpoint.

### Order Service

Require a confirmed reservation before a successfully created errand becomes
available. Atomically coordinate order state transitions and track pending credit
operations so an uncertain response can be retried/reconciled. A simple
`GetBalance` precheck cannot replace Credit's atomic check/reserve.

Call `UpdateReservation` with the current version and a new key for each intentional
edit. Retry that edit with the same key and parameters. Do not call
`ReleaseCredits` followed by `ReserveCredits` to edit a reward: those are separate
transactions, release makes the reservation terminal, and the same errand cannot
be reserved again through the create operation.

F6.3.3 prioritises courier acceptance over pending concurrent edits; F6.3.4 prevents
acceptance once an update has been initiated. F6.4.3 prioritises cancellation/expiry
over pending concurrent acceptance. The tested
[Order race-policy component](../../order-service/docs/race-policy.md) selects
winners and defines the pending-intent boundary. Order's lifecycle/database owner
must integrate its persistent queue and guarded transitions; Credit locks alone do
not enforce order-level priority. All hold releases/reservations remain Credit
Service business operations; Order sends a single update RPC for an edit.

Trigger settlement only for the assigned courier's confirmed delivery/completion
according to F8.5.1. Trigger release for cancellation, pre-acceptance expiry, and
accepted errands exceeding their delivery deadline. Coordinate deadline release
with settlement so both services agree on the terminal outcome. Releasing a hold
restores availability; it does not add to the requester's total balance.

### Frontend and backend adapter

Display total/reserved/available balance and paginated history through authenticated
backend endpoints. Derive the ordinary user's ID from their session and enforce
admin permissions for broader access. The browser does not call internal credit
gRPC directly. Include loading/failure handling and refresh after relevant mutations.
Coordinate the reservation notice required by F9.2.4 with the Notification owner.

## Non-functional requirements

| Requirement | Current evidence / remaining work |
| --- | --- |
| N3.2: automatic retries without duplicate processing | Credit handles successful retry replay; automatic transient-failure retry handling is not implemented in the shared client. Add bounded retries with the same key/parameters and durable recovery where required |
| N3.3: no successfully created errand without confirmed reservation | Requires Order Service integration and failure/timeout tests |
| N4.1–N4.3: at-most-once processing, no lost updates, atomic credit transactions | Implemented and tested for core credit operations; extend to new operations and integrated service flows |
| N1.1–N1.1.1: 95% of relevant REST requests/pages within 2 seconds at up to 5,000 users | No load/latency evidence yet; measure the complete backend/UI path. The shared default 3-second gRPC timeout does not establish this target |
| N9.1–N9.1.1: scaling and 5,000 concurrent credit transactions | Not verified; load test, size database connection capacity, and configure application/deployment scaling |
| N6.1–N6.2: automated CI, at least 70% unit-test coverage, integration checks | Correctness tests exist and last passed; coverage has not been measured and passing test counts do not prove 70% coverage. Add CI/coverage/integration gates |
| N8.1: parameterised database queries | Implemented for user-supplied values in core repository operations |
| N8.2–N8.3.1: PII encryption, access restrictions/audit, admin permission checks, default denial | Scoped backend credentials, User Service RS256 JWT ownership checks, admin-role checks for cross-user reads, access-decision logging and mandatory production/non-loopback TLS implemented and tested. Protected log collection, database-at-rest protection and future archive-email encryption remain; dispute/admin mutations are deferred |
| N2.1–N2.2.2, N3.1: availability, parallel version routing, zero-downtime deployment and rollback within 30 minutes | Deployment and verification remain; local database Compose does not satisfy these requirements |
| N7.1–N7.3: stated data handling and four-year inactivity retention | Requires a coordinated retention design across services, distinct from archive-age-based restoration rules |
| N5.1–N5.2: responsive UI and browser support | Frontend owner must test credit screens with the rest of the application |
| N10.1: refresh cached errand listings at least every 60 seconds | Order/frontend integration requirement; no credit-balance refresh interval is specified here |

## Wording and policy decisions

- **Reservation updates:** specify `available balance + this reservation's current
  amount >= new amount`, equivalently `available >= new amount - old amount`.
  Requiring the currently unreserved balance to cover the full new amount would
  reject valid edits. Updating the held amount inside one transaction provides the
  atomic replacement required by F8.4.2; it is not two independent release/reserve RPCs.
- **Duplicate requests:** F8.8.1 says to reject duplicate execution requests, while
  N4.1 allows returning the original result. Confirmed on 12 October 2026: rejection
  means the operation must not happen twice. Returning the saved result, or stating
  already processed, is allowed. Current successful retries return the saved result.
- **Delivery confirmation:** the current F8.5.1 says courier confirmation. An older
  spreadsheet comment mentions requester confirmation; keep the agreed requirement
  and Order Service's completion trigger consistent.
- **Returning accounts:** confirmed on 12 October 2026: restored credits replace
  the new 10-credit grant. Grant 10 only on the first account creation; do not grant
  again when restoring a returning user's identity. Current initialisation protects
  against repeat grants for one user ID; archive/email identity integration must
  preserve that rule across a returning user's new account ID.
- **Disputes:** deferred until last at the user's request. Later define adjustment amount/destination, how to handle insufficient
  available balance without violating F8.1.2, and how an already transferred/released
  errand receives a distinct audited adjustment without repeating its original transfer.
- **Four-year boundaries:** define restore eligibility at the exact boundary and
  distinguish archive retention from N7.3's inactivity-based removal rule.
- **Archive storage:** F2.7.3 explicitly specifies a separate archive database.
  User Service was checked on the working branch and all available local/remote
  branches after `git fetch origin` on 12 October 2026. Its schema has `isDeleted`,
  but no archive model/database, archive/restore migrations or lifecycle handlers
  were found. There is no implemented archive store to adopt yet. Confirm the storage
  design with the User Service owner. A physically separate database requires a reliable
  cross-database workflow; the current single-client credit transaction cannot commit
  writes across those separate databases atomically.
