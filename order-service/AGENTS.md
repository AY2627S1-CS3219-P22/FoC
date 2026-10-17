# Order Service conventions

- Requirements authority: the agreed Order PDF lifecycle, with UUID order IDs.
  States: UNASSIGNED, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED. Expiry cancels
  every nonterminal order, including PICKED_UP; no requester confirmation step.
- Node.js/TypeScript, Express, Zod, Prisma/PostgreSQL; `@grpc/grpc-js` for RPC.
- Request flow: routes/middleware -> controller -> service -> Prisma. No
  repository layer or cross-service database access.
- Authentication uses injected AuthProvider; authorization uses roles arrays
  (USER/ADMINISTRATOR) and order ownership, never provider-specific tokens.
- Only LocalJwtAuthProvider exists. Unknown AUTH_PROVIDER fails startup; never
  fall back from a remote provider to local verification silently.
- Schema changes use `prisma migrate dev`, never `db push`. SQL CHECK constraints
  are maintained in migrations because Prisma cannot express them in the schema.
- The generated Prisma client lives at src/generated/prisma (ignored) so this
  service cannot overwrite User Service's client. Builds copy it into dist.
- Keep public DTO mapping explicit: supplier bigints become decimal strings and
  timestamps become ISO UTC strings. Never expose internal recovery payloads.
- /health must probe PostgreSQL. Open-order availability uses database time.
- Phase 2 core commands are implemented through injected dependency interfaces.
  Acceptance/pickup work independently; creation/delivery/cancellation require
  adapters and return 503 with no side effects when they are missing. Credit is
  opt-in via configuredCreditGateway; User/Supplier adapters remain absent. Never wire
  test fakes into production or claim credit success without a matching receipt.
  Expiry/retry batches are callable internally but not scheduled at startup.
  grpc/ remains an independent UNIMPLEMENTED scaffold until integration.
- New domain validation lives in domain/orderRules.ts; database operations stay
  in API services. Mutations lock rows and sample database time after locking.
  Network calls run outside database transactions. Terminal status and a stable
  settlement/refund intent are committed together; uncertain outcomes stay pending.
- Tests use node:test and ephemeral HTTP listeners. Database integration tests
  require TEST_DATABASE_URL naming a dedicated order_service_test database; do
  not migrate, truncate, or reset any existing service/production database.
- Docker uses the root workspace build context and a Dockerfile-specific ignore
  file. Generate Prisma inside Linux; do not copy host-generated engines or keys.
  The per-service Compose stack mounts only User's public key, applies committed
  migrations after PostgreSQL is healthy, and runs REST as the node user.
