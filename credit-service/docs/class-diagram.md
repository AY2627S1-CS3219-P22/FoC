# Credit Service design reference

The team's class diagram, supplied on 11 October 2026, is the reference for this
service. Follow its classes, method names, and responsibilities where possible.
Preserve established repository contracts when they conflict, and document the mapping.
Use [the FR/NFR mapping](requirements.md) for the team's supplied behavioural rules
and integration requirements, including four-year archive restoration and dispute flows.

## Layers

```text
gRPC transport → CreditController → CreditService → CreditRepository
                                                   ↑ implements
                                            SqlCreditRepository
```

The controller delegates to service methods. The service applies business rules,
creates/modifies domain entities, and records history. The repository persists
accounts, reservations, history, archived balances, and idempotency records.
Credit changes, history, and the idempotency result must commit in one transaction.
`CreditDatabase` provides that transaction and its single SQL repository/client.
Idempotency is part of `CreditRepository`, not a separately committed store.

## Method reference

| CreditController | CreditService | Status |
| --- | --- | --- |
| `initCredits` | `initCredits` | Implemented |
| `getCreditBalance` | `displayCredit` | Implemented |
| `getCreditHistory` | `displayUserHistory` | Implemented |
| `reserveCredits` | `createReservation` | Implemented |
| `updateCredits` | `updateReservation` | Implemented |
| `releaseCredits` | `releaseReservation` | Implemented |
| `transferCredits` | `transferReservation` | Implemented |
| `archiveCredits` | `archiveCredit` | Deferred until User Service is ready |
| `restoreArchivedCredits` | `restoreArchivedAccount` | Deferred until User Service is ready |
| `adjustCreditsForDispute` | `adjustForDispute` | Pending dispute policy |

`recordReservation` is an internal service helper: changes are logged inside the
mutation transaction. It is not exposed as an independent RPC that could duplicate
history. Initialisation also records an `INITIAL_GRANT` history entry.

Repository methods from the diagram:

- Implemented: `saveCreditAccount`, `findByUserId`, `saveReservation`,
  `findReservation`, `saveCreditHistoryEntry`, `findCreditHistoryEntry`,
  `saveIdempotencyRecord`, `findIdempotencyRecord`.
- Pending with archive/restore: `saveArchivedBalance`, `findArchivedBalance`.
- Supporting methods: `createCreditAccount` preserves insert-only creation;
  `lockAccounts`/`lockResource` serialize concurrent mutations;
  `findCreditHistory` provides paginated history retrieval.

## Domain reference

| Class | Diagram attributes / behaviour |
| --- | --- |
| `CreditAccount` | `userID`, `totalCreditBalance`, `reservedCreditAmount`; `initAccount()` grants 10 once on a new instance, `getAvailableBalance()` excludes held credits |
| `Reservation` | `userID`, `errandID`, `reservationID`, `creditAmount`, `reservationStatus` |
| `CreditHistoryEntry` | `userID`, `id`, `type`, `amount`, `timestamp`, `errandID` |
| `IdempotencyRecord` | `userID`, `key`, `timestamp`, `operationType`, `result` |
| `ArchivedBalance` (pending) | `email`, `archivedAt`, `creditAmount` |

`ReservationStatus`: `RESERVED`, `RELEASED`, `TRANSFERRED`.
`HistoryType`: `RESERVE`, `UPDATE`, `RELEASE`, `TRANSFER`, `DISPUTE_ADJUST`,
plus `INITIAL_GRANT` to audit the starter credits.
`DISPUTE_ADJUST` names the future operation; dispute processing is not implemented.

An account has zero or more reservations and history entries. Relationships use
stable identifiers rather than embedding every reservation/history row inside the
account object; records are loaded through the repository.

## Compatibility and supporting fields

- The existing protobuf uses string IDs and `orderId`/`requesterId` names. Domain
  entities use `errandID`/`userID`; response snapshots preserve those API names.
  Account/reservation request objects also retain the established client field names.
  UUIDs remain valid identifiers, but UUID-only validation would reject identifiers
  accepted by the existing contract.
- Domain `TRANSFERRED` maps to existing protobuf/database `SETTLED`. Existing RPC
  `SettleCredits` routes to `CreditController.transferCredits` and
  `CreditService.transferReservation`.
- Domain history types map to the existing persisted/API types: `RESERVE` →
  `RESERVED`, `UPDATE` → `RESERVATION_UPDATED`, `RELEASE` → `RELEASED`, and
  `TRANSFER` → `TRANSFER_OUT`/`TRANSFER_IN` according to the signed total delta.
- JavaScript/TypeScript has no `long` primitive. Credits remain whole `number`
  values bounded by the existing protobuf `int32` and PostgreSQL integer range.
  Adopting larger amounts would require a coordinated protocol/database migration.
- Reservations retain `courierID` and `version` for transfer destinations and stale
  update protection. History retains `reservationID`, `totalDelta`, and
  `reservedDelta` to explain both balances. Its signed `amount` is the relevant
  balance change: total delta for grants/transfers, reserved delta for holds/updates/releases.
- Idempotency retains a request hash to reject changed payloads under the same key.
  Its result is a JSON response snapshot, matching existing retry storage and allowing
  exact response replay. Operation names, hashes, and result fields are preserved.
- Extra locking/transaction helpers support concurrency without changing the diagram's
  controller/service/repository responsibilities.

## Policies still to define

Archived-user storage, archive/restore, retention and their integration are deferred
at the user's request until User Service implements its deletion/archive lifecycle.
The following rules remain recorded for that later work.

The FRs require no active errands before archive and restoration for matching emails
within four years. User deletion must additionally be blocked by unresolved disputes
and other conditions in F2.7.5. The remaining policy details include verified restore
identity, archive storage choice, and exact retention boundaries.
Starter-grant treatment is now confirmed: restore the archived balance without
another 10-credit grant. The grant occurs only on first account creation.

F8.9 requires admin-triggered dispute adjustments: transfer an existing hold, or
reserve and transfer when no hold exists. Define insufficient-balance handling,
adjustment amount/destination, audit reason/reference, and retry identity. Add the
remaining diagram methods with these rules and transactional tests rather than
no-op placeholders.
Dispute implementation is deferred until last at the user's request.
