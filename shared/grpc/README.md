<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-20–2026-10-21 (Asia/Singapore).
Scope: Documented the human-finalized six-RPC credit contract, authentication, REST-only history, generated-file attribution, and bounded Credit client retries.
Author review: Pending human review.
Prompts and key responses: ../../credit-service/ai/usage-log.md, entries 007–012, 014, 016, 018, 021–022, 024–027.
-->

# Shared gRPC contracts

The internal `@foc/grpc` workspace supplies generated TypeScript contracts,
Promise clients, metadata, finite deadlines, and server lifecycle helpers.

| Service | Default gRPC port | RPCs | Contract |
| --- | ---: | --- | --- |
| User | 50051 | GetPublicProfile | user-service/proto/user.proto |
| Order | 50053 | GetOrder | shared/grpc/proto/order.proto |
| Credit | 50054 | GetBalance, ReserveCredits, UpdateReservation, ReleaseCredits, SettleCredits, GetReservation | shared/grpc/proto/credit.proto |
| Supplier | 50052 | GetSupplier, IsOpen | shared/grpc/proto/supplier.proto |

Order remains a scaffold. Credit's six handlers are connected to its SQL business
service and authorize only Order Service. User public-profile lookup and Supplier
IsOpen use their existing service implementations.

## Credit contract alignment

The [human's latest definitions](../../credit-service/docs/user-decisions.md)
remove initialization and both history RPCs. Initialization is an internal
user.created allocation callback; RabbitMQ startup belongs to teammates.
Frontend balance and own-history reads use authenticated REST on port 3004.
No gRPC history messages/client wrappers remain.

- GetBalance takes user_id and returns user_id, total_credits, reserved_credits,
  and computed available_credits. user_id is restored at field 1; timestamp fields
  remain reserved.
- ReserveCredits takes order_id/requester_id/amount; UpdateReservation takes
  order_id/amount/expected_version; ReleaseCredits takes order_id; SettleCredits
  takes order_id/courier_id. Each returns Reservation: order_id, requester_id,
  amount, status, optional courier_id, reservation_id, version.
- GetReservation takes order_id and returns the same full Reservation message
  as mutation calls, including order/requester/reservation IDs and optional courier.
  The separate GetReservationResponse message/generated type is removed.
- External amount maps to SQL credit_amount. Status values are RESERVED,
  RELEASED, SETTLED. Settle uses the existing transfer idempotency operation.
- Credit computes its operation-scoped lookup keys and SHA-256 request hashes
  from the human's definitions; callers supply no idempotency key. Matching
  completed retries return the stored response before current-state checks.
  Mutation replies describe state immediately after their operation. A saved
  reserve retry after an update still returns the original snapshot; it can also
  describe RESERVED after a later release or settlement. Call GetReservation
  for the full current reservation. Missing-result recovery fallbacks
  remain as specified in the credit-service documentation.
- Existing retained field numbers and enum values are preserved, following the
  [Protobuf update guidance](https://protobuf.dev/programming-guides/proto3/#updating).

## Calling Credit from Order Service

For local plaintext development, with the same configured secret on both services:

```typescript
import { Metadata } from '@grpc/grpc-js';
import { createCreditClient } from '@foc/grpc';

const credit = createCreditClient('localhost:50054'); // 1,300 ms overall budget.
const metadata = new Metadata();
metadata.set('x-credit-service-token', process.env.CREDIT_ORDER_SERVICE_TOKEN!);
try {
  const balance = await credit.getBalance({ userId: 'student-id' }, { metadata });
  console.log(balance.availableCredits);
} finally {
  credit.close();
}
```

Reuse clients across requests and close them at shutdown. Outside local use,
configure client TLS credentials through ClientConfig.credentials, and configure
Credit's TLS certificate/key. Credit requires TLS unless explicitly in local mode.
Missing or unknown secrets return UNAUTHENTICATED; known unauthorized service
identities return PERMISSION_DENIED. Identity comes from the matched secret.
Business error reasons are returned in x-credit-error-reason trailing metadata.
Only Credit's explicit ValidationError maps to INVALID_ARGUMENT. Unexpected
errors such as ordinary TypeError return generic INTERNAL details and are logged
server-side. Existing business/authentication/transient mappings are preserved.

Per-call options accept metadata, timeoutMs, and an upstream deadline. The client
preserves error codes/details/trailers and uses the earlier deadline. See
[gRPC deadlines](https://grpc.io/docs/guides/deadlines/) and
[credit-service setup](../../credit-service/README.md).

### Credit client retries

All six Credit RPC wrappers use an application retry loop. Only UNAVAILABLE,
ABORTED, and DEADLINE_EXCEEDED are retried. The built-in settings are:

| Client/per-call option | Default | Meaning |
| --- | ---: | --- |
| timeoutMs | 1300 | Overall budget, including attempts and backoff |
| maxAttempts | 3 | Total attempts, including the initial call |
| initialDelayMs | 50 | Base delay before the first retry |
| backoffMultiplier | 2 | Growth factor for each later base delay |
| maxDelayMs | 500 | Cap on the base delay before jitter |

For each retry, the delay is `base / 2 + Math.random() * base / 2`. The base starts
at `min(initialDelayMs, maxDelayMs)` and grows up to maxDelayMs. Default retry
delays therefore fall between 25–50 ms and 50–100 ms.

Client config overrides the defaults; per-call options override individual client
settings. Set maxAttempts to 1 to disable application retries for that call/client.
Attempts must be positive safe integers. Delay settings accept integer milliseconds
from 0 through 2147483647; backoffMultiplier must be finite and at least 1.

```typescript
const credit = createCreditClient('localhost:50054', {
  timeoutMs: 1300,
  maxAttempts: 3,
  initialDelayMs: 50,
  backoffMultiplier: 2,
  maxDelayMs: 500,
});

const reservation = await credit.getReservation(
  { orderId },
  { metadata, deadline: incomingDeadline, maxAttempts: 1 },
);
```

One absolute deadline is calculated when the call starts. Every attempt uses all
remaining time under that deadline; there is no separate per-attempt cap. An earlier
upstream deadline wins. A server's early DEADLINE_EXCEEDED can retry only if time
remains after the delay. A timeout that consumes the entire budget cannot retry.
If the delay consumes the remaining budget, no wait or retry begins. The deadline
is checked again after waiting to account for late timers. When attempts or time
run out, the last error object is thrown unchanged, preserving its code, details,
and metadata. If the upstream deadline is already expired before any attempt,
the wrapper rejects with DEADLINE_EXCEEDED without invoking the transport.

Requests and supplied metadata are reused across attempts. Mutation retries replay
saved operation snapshots; use GetReservation for current state. Other service
clients retain their existing single-attempt behavior and 3,000 ms default timeout.
An explicit timeoutMs, including one passed through createPeerClients from a
service's GRPC_TIMEOUT_MS configuration, overrides Credit's 1,300 ms default.

## Build and verify

From the root with Node.js 20+:

```sh
npm ci
npm run grpc:generate
npm run build
npm test
```

The 51 shared checks passed after adding Credit retries, including deterministic
deadline/backoff/error checks and real gRPC transport coverage. Credit's
PostgreSQL/REST/authentication tests run separately in its workspace.
Credit source lives under credit-service/src/{domains,repos,services,grpc,rest,events},
with env.ts/index.ts in src and its package/test/scripts at the service root. The
existing @foc/credit-grpc package identifier is retained.

Follow each service README for startup and env configuration. Credit now connects
to PostgreSQL and exposes REST as well as gRPC. User Service retains its existing
startup; no User Service publisher or shared messaging startup was added here.

## Regenerating contracts

Fields are snake_case on the wire and camelCase in JavaScript. Enums decode as
strings, int64/uint64 as decimal strings, and protobuf timestamps as seconds/nanos.
Regenerate/build/test after proto changes and retain generated files alongside
the proto. Credit files regenerated during usage-log entries 007, 009–012, 016,
and 021 carry attribution headers. Regeneration overwrites these; restore them
and record later assistance in the service-local log. Retired generated history
and initialization files were removed.

The loader reads the existing User Service proto in place; retain repository
layout when packaging. Other service contracts and startup ownership remain in
their existing folders. The compatibility notes below record earlier checks.

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
