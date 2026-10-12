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
- Phase 1 is read-only REST; do not expose writes or claim actual credit activity
  before the later credit integrations exist. grpc/ is the existing independent
  scaffold and remains UNIMPLEMENTED in Phase 1.
- Tests use node:test and ephemeral HTTP listeners. Database integration tests
  require TEST_DATABASE_URL naming a dedicated order_service_test database; do
  not migrate, truncate, or reset any existing service/production database.
