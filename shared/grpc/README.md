<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Documented the human-finalized nine-RPC credit contract, initialization payload/replay, SHA-256 key specification, and generated-file attribution.
Author review: Pending human review.
Prompts and key responses: ../../credit-service/ai/usage-log.md, entries 007–012.
-->

# gRPC endpoint scaffolding

The shared `@foc/grpc` package provides generated TypeScript contracts, Promise
clients, deadlines, and server helpers. Order and credit handlers remain
`UNIMPLEMENTED`; User Service public-profile lookup and Supplier `IsOpen` have
implementations. This credit-contract update does not implement service handlers.

| Service  | Default host port | RPCs                                                              | Contract                                   |
| -------- | ----------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| User     | 50051             | `GetPublicProfile`                                                | `user-service/proto/user.proto` (existing) |
| Order    | 50053             | `GetOrder`                                                        | `shared/grpc/proto/order.proto`            |
| Credit   | 50054             | `InitCredits`, `GetBalance`, `GetUserCreditHistory`, `GetOrderCreditHistory`, `ReserveCredits`, `UpdateReservation`, `ReleaseCredits`, `SettleCredits`, `GetReservation` | `shared/grpc/proto/credit.proto`           |
| Supplier | 50052             | `GetSupplier`, `IsOpen`                                           | `shared/grpc/proto/supplier.proto`         |

The order contract remains an initial integration proposal. All nine
credit RPCs now reflect the human-specified credit schema and idempotency flow,
documented in [the credit-service reference](../../credit-service/docs/user-decisions.md).
No credit business operations are implemented.

## Credit contract alignment

- `InitCredits` takes `user_id` and returns `InitCreditsResponse` with exactly
  `user_id`, `total_credits`, `reserved_credits`, and `available_credits`.
  Duplicate calls replay the original saved success without another grant.
- `Balance` contains exactly `total_credits`, `reserved_credits`, and computed
  `available_credits`, without user ID or timestamps.
- `Reservation` carries `reservation_id`, `order_id`, `requester_id`, optional
  `courier_id`, `amount`, `status`, and `version`, without timestamps.
  The external `amount` maps to SQL `credit_amount`.
- The latest human-supplied contract specifies `amount` for reserve/update and
  reservation reads. `ReserveCreditsRequest` and `Reservation` use `amount` at
  existing field number `3`; the interim `credit_amount`/`creditAmount` API name
  is superseded. SQL continues to use `credit_amount`.
- Mutation requests do not accept caller idempotency keys. The human specified
  deterministic recomputation by Credit Service from each request, with a lock on
  `(operation_type, key)`, lookup/hash comparison, and atomic persistence.
  The human confirmed SHA-256. No hashing/locking business logic is implemented.
  `SettleCredits`
  corresponds to the database's existing `transfer` operation type.
- `UpdateReservation` takes `order_id`, `amount`, and `expected_version` and
  returns `Reservation`. `GetReservation` is read-only and returns exactly
  `status`, `amount`, and `version` in `GetReservationResponse`.
- `CreditHistoryEntry` contains all eight SQL history fields, preserving signed
  deltas and optional order/reservation IDs.
- Both history RPCs return `CreditHistoryPage` with `entries` and
  `next_page_token`. The contract specifies newest-first pagination; stubs do not
  execute database queries or implement page ordering/token behavior yet.
- New fields are appended without changing existing field numbers or enum
  numeric values, following the [Protobuf update documentation](https://protobuf.dev/programming-guides/proto3/#updating).
- The requested schema migration renames `requestor_id` to `requester_id` and
  replaces stored `transferred` status with `SETTLED`. The human subsequently
  confirmed uppercase statuses everywhere; migration 003 converts existing
  lowercase values and sets the default to `RESERVED`. SQL and proto now use
  `RESERVED`, `RELEASED`, and `SETTLED`.

The human supplied the nine-method RPC list in
[exchange 009](../../credit-service/ai/prompts/009-finalized-rpc-list.md).
Request messages are prepared for initialization, user/order history,
reservation updates, and reservation lookup. History request pagination fields
are optional; update requests carry `expected_version`. Reservation update/lookup
declarations, client wrappers, and unimplemented handlers are added. The two
history declarations/wrappers/stubs share the confirmed page/entry messages.
Initialization now has its finalized response, Promise wrapper, and unimplemented
handler. It must allocate 10 credits only at first registration, handle failure
or delay after User Service registration, and avoid another initial grant on
duplicates or future restoration. The human chose the general original-success
replay rule for duplicate initialization, superseding a separate already-allocated
payload. No extra status fields or application error-code mapping were added.
No initialization, pagination, hashing/locking, or credit business behavior has
been implemented by this contract work.

## Run locally

From the repository root, with Node.js 20+:

```bash
npm ci
npm run build
npm test
```

Start each new scaffold in a separate terminal:

```bash
npm run dev --workspace @foc/order-grpc
npm run dev --workspace @foc/credit-grpc
npm run dev --workspace @foc/supplier-grpc
```

These are independent gRPC processes under each service's `grpc/` directory.
They do not connect to databases or run the service's REST implementation.
Start User Service separately using its existing README; its existing gRPC
server and contract are reused without modifications. The opt-in caller example
is at `user-service/examples/grpc-clients.ts` and is not wired into its startup.

Each scaffold has a `grpc/.env.example`. Copy it to `grpc/.env` and adjust peer
addresses when needed. Workspace commands run with that directory as the working
directory, so dotenv reads the correct file. `GRPC_PORT` controls the listener;
`*_GRPC_ADDR` controls outbound calls. `GRPC_TIMEOUT_MS` defaults to 3000.

The User Service uses gRPC port **50051**, Supplier **50052**, Order **50053**,
and Credit **50054**.
Keep these assignments consistent across host development, Docker Compose, and
gRPC client configuration. Docker callers use service DNS names instead of
`localhost`, with the actual container listener port.

## Calling another service

```typescript
import { createCreditClient } from '@foc/grpc';

const credit = createCreditClient('localhost:50054', { timeoutMs: 3000 });
try {
  const balance = await credit.getBalance({ userId: 'user-uuid' });
  console.log(balance.availableCredits);
} finally {
  credit.close();
}
```

Until credit handlers are implemented, this call rejects with gRPC `UNIMPLEMENTED`.
Reuse clients across requests and close them at shutdown. New scaffolds expose
`createClients()` in `grpc/src/grpc/clients.ts`; startup creates these peer clients
and closes them after the server drains. All clients preserve gRPC error codes,
details, and metadata. Per-call options accept `metadata`, `timeoutMs`, and an
incoming RPC's `deadline`. No automatic application retries are added.
Finite deadlines follow the [gRPC deadline guidance](https://grpc.io/docs/guides/deadlines/).

## Extending the scaffolds

Replace only the handlers in each `grpc/src/grpc/server.ts` when implementing
business logic. The generated handler interfaces specify request/response
types. Fields use snake_case on the wire and camelCase in JavaScript; enums decode
as strings, uint64/int64 as strings, and timestamps as `{ seconds, nanos }`.
Run `npm run grpc:generate` after changing contracts, then build/test and commit
the generated files in `src/generated/` alongside the protos.

Credit TypeScript files regenerated during usage-log entries 007 and 009–012 have
attribution headers for the AI-influenced proto change. Regeneration overwrites
those headers; preserve or restore them when regenerating the same assisted
contract, and record later assistance in the service usage log.

`@foc/grpc` is an internal monorepo workspace package. Its loader deliberately
reads the existing User Service proto in place, so retain the repository layout.
Integrating it into an existing service is a later explicit change: declare the
dependency in that service's package manager, import the new handlers/clients,
and connect lifecycle hooks to its existing entrypoint. The scaffold listeners
currently use the same insecure local transport as User Service.

## Branch compatibility checked on 4 October 2026

Remote references were refreshed with `git fetch origin`; no branch was merged.

- `origin/F2-auth-jwt-rbac` at `8586684` (1 October): CommonJS TypeScript,
  Prisma user IDs, JWT/RBAC, and the same unimplemented public-profile RPC.
  Its source entrypoint, auth code, package/lock files, and proto remain untouched.
- `origin/init-supplier-database` at `55af095` (1 October): ES modules, Yarn,
  Express, Drizzle/Supabase, and JWT validation. The new `supplier-service/grpc/`
  package has its own module boundary; its files do not overlap that branch's
  service package, `src/index.ts`, REST handlers, tests, schema, or Docker files.
- `origin/refine-db-search` is an older supplier branch. Its supplier files also
  do not overlap the scaffold directory. The other fetched branches contain no
  order/credit implementations.

Supplier contract fields follow the current Drizzle schema: a positive bigint
`supplierId` (decimal string on the wire/JS), integer `floor`, `buildingName`,
nullable hours/image fields, and coordinates. A future repository adapter should
convert Drizzle's numeric coordinate strings to doubles, map `imageURL` to
`imageUrl`, check IDs before passing them to the repository's JavaScript-number
parameter, and keep its existing soft-delete filtering. No adapter is implemented.

Merge rehearsals in a temporary checkout found no conflicts with the latest User
Service branch. Both supplier branches produced only a `.gitignore` conflict;
the same conflict occurs when merging them into unchanged `main`, so the
scaffolding introduces no additional conflicting paths in these rehearsals.
The supplier branch's empty root `package.json` merged with the workspace
manifest automatically. Preserve its service-level Yarn setup. These rehearsals
check Git compatibility; they do not validate the merged services' business logic.
