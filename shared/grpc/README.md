# gRPC endpoint scaffolding

The shared `@foc/grpc` package provides generated TypeScript contracts, Promise
clients, deadlines, and server helpers. Every endpoint remains `UNIMPLEMENTED`.
Existing REST handlers, repositories, databases, auth, and startup files are unchanged.

| Service  | Default host port | RPCs                                                              | Contract                                   |
| -------- | ----------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| User     | 50052             | `GetPublicProfile`                                                | `user-service/proto/user.proto` (existing) |
| Order    | 50051             | `GetOrder`                                                        | `shared/grpc/proto/order.proto`            |
| Credit   | 50053             | `GetBalance`, `ReserveCredits`, `ReleaseCredits`, `SettleCredits` | `shared/grpc/proto/credit.proto`           |
| Supplier | 50054             | `GetSupplier`, `IsOpen`                                           | `shared/grpc/proto/supplier.proto`         |

The order and credit contracts are initial integration proposals because the
fetched branches have no implementations for those services. Credit mutation
comments describe the intended behavior for future handlers; no ledger logic is implemented.

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

User Service's existing Docker Compose listens on **50051**, while its host-dev
configuration defaults to **50052**. If using that Compose stack, set
`USER_GRPC_ADDR=localhost:50051` and use another order port, for example
`GRPC_PORT=50055` / `ORDER_GRPC_ADDR=localhost:50055`. This scaffolding preserves
the existing Compose configuration. Docker callers use service DNS names instead
of `localhost`, with the actual container listener port.

## Calling another service

```typescript
import { createCreditClient } from '@foc/grpc';

const credit = createCreditClient('localhost:50053', { timeoutMs: 3000 });
try {
  const balance = await credit.getBalance({ userId: 'user-uuid' });
  console.log(balance.availableCredits);
} finally {
  credit.close();
}
```

Until handlers are implemented, this call rejects with gRPC `UNIMPLEMENTED`.
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
