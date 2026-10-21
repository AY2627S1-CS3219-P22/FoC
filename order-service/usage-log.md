<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-21.
Scope: Generated this usage record. Team review pending. -->

# AI usage log

## 2026-10-21 (Asia/Singapore): branch setup and local Order database

Tool: ChatGPT through Codex. Model identifier is not exposed in this session.
Modes: repository operations, configuration generation, documentation.

### Exact user prompts

> Set up order-core to have the same code as main by pulling etc and then lets start building. Ask me architecture etc questions if that is required by the guidelines

> Lets start by setting up the database. I think Postgres SQL works well, so similar database type as my teammate + ACID + concurrency control
> We will also work with docker containerisation so maybe set that up too

The author also supplied the CS3219 AI Usage Policy as a constraint in this chat.

### Key responses and output

- Preserved previous order-core commits on backup/order-core-before-main-20261021 and aligned order-core with origin/main at f2cedb3. Preserved leftover generated files in /private/tmp/foc-order-core-before-main-20261021/.
- Inspected User Service's PostgreSQL 16 Compose setup.
- Generated order-service/compose.yaml with PostgreSQL 16, local credentials, localhost port 5433, a persistent volume and a readiness check.
- Generated setup documentation and the final README disclosure section.
- Asked the author for the approved fields, types, statuses, relationships, constraints, database/migration library and concurrency strategy before implementing them.
- Explained that PostgreSQL transactions/concurrency primitives do not alone implement business-level concurrency rules.

### Locations

- order-service/compose.yaml
- order-service/README.md
- README.md
- order-service/usage-log.md

### Verification and author review

Verification: Compose configuration validation and git diff --check passed.
The new container reported healthy; SQL connected to order_service on PostgreSQL
16.15, and BEGIN / SELECT 1 / ROLLBACK completed successfully.
Application-level concurrency has not been implemented or tested. Human author review, understanding,
and validation remain pending; no human review is claimed by this log.

## 2026-10-21 (Asia/Singapore): Prisma setup

Tool: ChatGPT (Codex). Modes: dependency setup, transcription, documentation.

### Exact author schema input

```prisma
model Order {
  id                 String              @id @db.Uuid
  creation           OrderCreation       @relation(fields: [id], references: [orderId], onDelete: Restrict)
  requesterId        String
  courierId          String?
  supplierId         BigInt
  pickupStore        String
  pickupLocation     String
  requesterName      String
  courierName        String?
  destination        String
  requestDetails     String
  credits            Int
  expiryTime         DateTime            @db.Timestamptz(3)
  status             OrderStatus         @default(UNASSIGNED)
  cancellationReason CancellationReason?
  creditState        CreditState         @default(RESERVED)
  createdAt          DateTime            @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime            @updatedAt @db.Timestamptz(3)
  acceptedAt         DateTime?           @db.Timestamptz(3)
  pickedUpAt         DateTime?           @db.Timestamptz(3)
  deliveredAt        DateTime?           @db.Timestamptz(3)
  cancelledAt        DateTime?           @db.Timestamptz(3)

  @@index([status, expiryTime])
  @@index([requesterId, createdAt])
  @@index([courierId, createdAt])
}
```

### Exact subsequent implementation prompts

> Conditional update should work well for now since its simple and also ensures that only one courier gets the accepted order

```text
enum OrderStatus {
  UNASSIGNED
  ASSIGNED
  PICKED_UP
  DELIVERED
  CANCELLED
}
Go ahead with Prisma
```

### Key responses and output

- Installed Prisma CLI and @prisma/client 6.19.3 in existing @foc/order-grpc workspace, matching User Service.
- Preserved supplied model and enum in order-service/prisma/schema.prisma.draft.
- Requested OrderCreation, CancellationReason and CreditState definitions; no missing schema definitions were invented. No migrations or Order client generated.
- Recorded the author's conditional-update choice; no acceptance handler implemented.
- Updated order-service/grpc/package.json, package-lock.json, schema draft and README documentation. JSON files cannot contain attribution comments; package metadata and this log record their attribution.
- npm install completed and reported three high-severity dependency findings. No automatic dependency fixes were applied.

Human author review remains pending.

## 2026-10-21: Complete author schema implementation

Tool: ChatGPT (Codex). Modes: transcription, migration generation, documentation.

Exact supplied enum definitions and model prompt are archived below; formatting of Order is unchanged from its earlier supplied text.

### Enum prompt

```prisma
enum CancellationReason {
  REQUESTER
  EXPIRY
}

enum CreditState {
  RESERVED
  SETTLEMENT_PENDING
  SETTLED
  REFUND_PENDING
  REFUNDED
}
enum CreationState {
  PENDING
  SUCCEEDED
  COMPENSATING
  FAILED
}

enum CreditOperationType {
  RESERVE
  SETTLE
  REFUND
}

enum OperationState {
  PENDING
  PROCESSING
  SUCCEEDED
  PERMANENTLY_FAILED
}
```

### Model prompt

```prisma
model OrderCreation {
  orderId            String            @id @default(uuid()) @db.Uuid
  requesterId        String
  idempotencyKey     String
  requestFingerprint String
  payload            Json
  state              CreationState     @default(PENDING)
  createdAt          DateTime          @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime          @updatedAt @db.Timestamptz(3)
  order              Order?
  creditOperations   CreditOperation[]

  @@unique([requesterId, idempotencyKey])
}

model Order {
  id                 String              @id @db.Uuid
  creation           OrderCreation       @relation(fields: [id], references: [orderId], onDelete: Restrict)
  requesterId        String
  courierId          String?
  supplierId         BigInt
  pickupStore        String
  pickupLocation     String
  requesterName      String
  courierName        String?
  destination        String
  requestDetails     String
  credits            Int
  expiryTime         DateTime            @db.Timestamptz(3)
  status             OrderStatus         @default(UNASSIGNED)
  cancellationReason CancellationReason?
  creditState        CreditState         @default(RESERVED)
  createdAt          DateTime            @default(now()) @db.Timestamptz(3)
  updatedAt          DateTime            @updatedAt @db.Timestamptz(3)
  acceptedAt         DateTime?           @db.Timestamptz(3)
  pickedUpAt         DateTime?           @db.Timestamptz(3)
  deliveredAt        DateTime?           @db.Timestamptz(3)
  cancelledAt        DateTime?           @db.Timestamptz(3)

  @@index([status, expiryTime])
  @@index([requesterId, createdAt])
  @@index([courierId, createdAt])
}

// Durable intents only in Phase 1; execution/recovery arrives in Phases 3–4.
model CreditOperation {
  id             String              @id @default(uuid()) @db.Uuid
  orderId        String              @db.Uuid
  creation       OrderCreation       @relation(fields: [orderId], references: [orderId], onDelete: Restrict)
  type           CreditOperationType
  payload        Json
  state          OperationState      @default(PENDING)
  attempts       Int                 @default(0)
  nextRetryAt    DateTime            @default(now()) @db.Timestamptz(3)
  leaseExpiresAt DateTime?           @db.Timestamptz(3)
  lastError      String?
  createdAt      DateTime            @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime            @updatedAt @db.Timestamptz(3)

  @@unique([orderId, type])
  @@index([state, nextRetryAt])
}
```

### Key response and implementation

Complete schema supplied by author. Transcribed definitions without adding business constraints. Added Prisma scripts and service-specific client output, generated initial migration and client, and applied to the verified empty local Order Docker database. Added migration attribution; replayed initial migration on that newly created empty database to keep its recorded checksum consistent. No order business handlers or credit execution/recovery were implemented.

Affected files: .gitignore, order-service/grpc/package.json, order-service/prisma/schema.prisma, order-service/prisma/migrations/*, Order README and root README, and this log. Earlier entries are consolidated in this service-local log. Human author review remains pending.

Verification: prisma validate passed; migration applied and Prisma client generated. prisma migrate status reports up to date. SQL inspection confirmed all three tables and restrictive foreign keys; OrderCreation and CreditOperation inserts succeeded inside a rolled-back transaction. Generated migration includes author-specified unique indexes. git diff --check passed. Application concurrency remains unimplemented and untested.

## 2026-10-21: Order setup issue

Tool: ChatGPT (Codex). Mode: dependency installation and convention inspection.

### Exact user prompt

```text
Lets continue working on anything else missing in this Issue
### Description
Set up the Order Service project structure and development environment, following the existing microservice conventions used by the team.

### Tasks
- [ ] Initialize the Order Service with the team's existing backend framework and dependencies.
- [ ] Set up the project folder structure, following existing service conventions.
- [ ] Configure environment variables and application settings.
- [ ] Set up the database connection configuration for PostgreSQL.
- [ ] Configure the Order Service to run within the existing Docker environment.
- [ ] Implement a basic health check endpoint.
- [ ] Document setup and startup instructions in the README.

### Acceptance Criteria
- [ ] Order Service starts successfully without errors.
- [ ] Health check endpoint returns a successful response.
- [ ] Environment variables are loaded correctly.
- [ ] Service runs successfully within the existing Docker setup.
- [ ] Setup instructions are documented.
```

### Key response and output

Inspected User Service's Express/TypeScript, dotenv/Zod, Prisma, folder structure,
PostgreSQL-backed GET /health, and combined REST/gRPC startup conventions.
Installed Express 5.2.1 and @types/express 5.0.0 matching User Service in the
existing Order workspace (package.json and root package-lock.json affected).
Requested team confirmation of Order transport/folder conventions and whether
the existing workspace should move before implementing those structural changes,
as the supplied course policy reserves component boundaries/interfaces for the team.
Installation succeeded; human author review remains pending.

## 2026-10-21: approved application scaffold implementation

Exact user reply to the structure/health confirmation question: `Yes.`

Interpretation stated before work: use Express plus gRPC, src/api and src/grpc,
root env/db, database-backed health matching User Service; preserve the existing
workspace location at order-service/grpc. No workspace relocation performed.

Key response: “I’ll use the confirmed Express + gRPC structure and database-backed
`/health` endpoint. I’ll keep the workspace at `order-service/grpc` for this issue
and proceed with startup, environment configuration, Docker integration, and verification.”

Tool: ChatGPT (Codex). Modes: implementation/configuration/documentation generation.
Implemented PostgreSQL connection/probe, dotenv/Zod configuration, HTTP health,
combined startup/shutdown, Prisma build scripts, Dockerfile/context filter and
Compose app service. Updated .env.example and README instructions. Affected files
are order-service/grpc/src/{index.ts,env.ts,db.ts,api/app.ts}, grpc/package.json,
grpc/.env.example, order-service/{Dockerfile,Dockerfile.dockerignore,compose.yaml,
README.md}, root README and this log. Human author review remains pending.

Verification completed: shared gRPC and Order TypeScript builds passed; Compose
configuration validation passed; Docker build/startup/migration completed and both
containers healthy. HTTP health returned exact User Service-style JSON with 200
when PostgreSQL was available and 503 when stopped; restored database and app
health afterward. Temporary dotenv file loaded configured ports and DATABASE_URL;
invalid PORT=0, GRPC_PORT=65536 and HTTPS DATABASE_URL were rejected. Compiled host
startup on PORT=3013/GRPC_PORT=50063 returned health 200 and exited cleanly on
SIGTERM. git diff --check passed. No order business logic was implemented.

## 2026-10-21: Consolidate Order AI usage records

Tool: ChatGPT (Codex). Mode: documentation refactoring.

Exact user prompt:

> Combine the AI log into within order-service AI log as I prefer most files commited from order service to be within order service

Key response: Consolidated all entries in order-service/usage-log.md, removed the
duplicate root ai/usage-log.md, and updated README, file attribution and package
metadata references. Retained the historical log path inside the already-applied
initial migration's comment to preserve its checksum; its records now live here.
Human author review remains pending.

## 2026-10-21: minimize and verify shared lockfile

Tool: ChatGPT (Codex). Modes: debugging, dependency configuration and verification.

Exact user prompt: “Could you do that please?” This authorizes the preceding
proposal to preserve Credit's declared dependencies, minimize unrelated dependency
changes, and verify a clean install and affected services before merging.

Key exchanges: Explained that npm had regenerated the shared root lockfile while
adding Order dependencies, that active Credit dependencies remained under
credit-service/grpc, and that other branches remain unchanged until integration.
Confirmed original main lockfile is malformed: amqplib's engines/package objects
were missing their closing braces. Fetched origin/main; it remains f2cedb3.

Generated candidate in an isolated /private/tmp checkout from main's lockfile
with that syntax repair, using npm install --package-lock-only --ignore-scripts.
Adopted the candidate only after a clean npm ci passed. Every original package
entry and version is preserved, including Credit entries. Non-Order workspace
dependency ranges remain unchanged. Root lockfile diff reduced from 1767 added /
989 removed lines to 1388 added / 35 removed lines. Remaining edits include Order's
new dependency records, syntax repair and npm workspace/metadata normalization.
No Credit/Supplier manifests or source files were changed.

Verification:
- Clean root npm ci passed in isolated checkout.
- Installed User's own npm lock and Supplier's frozen Yarn lock in that checkout;
  generated User Prisma client and temporary keys only there.
- All five root workspace builds passed: shared grpc, Order, Credit, Supplier grpc,
  and shared messaging.
- Credit gRPC smoke check passed on ephemeral loopback port with expected
  UNIMPLEMENTED response from the existing scaffold.
- Root npm test remains blocked: shared/grpc/test/transport.test.cjs imports
  supplier-service/grpc/dist/grpc/server.js, but unchanged Supplier config emits
  grpc/dist/grpc/src/grpc/server.js. The test and Supplier configuration are
  unchanged. No all-tests-passing claim is made.
- Docker image rebuilt with minimized lockfile; Compose startup completed healthy, and HTTP /health returned 200 with {"status":"ok","db":"up"}.

Author review remains pending. Changes affect package-lock.json and this log;
originally staged content is preserved in the index until the author stages
these newer working-tree changes.

## 2026-10-22: Create/edit/cancel/expiry lifecycle implementation

Tool: ChatGPT through Codex; exact model identifier not exposed. Modes: implementation,
debugging, tests and documentation. Human author review remains pending.

### Prompts and key exchanges

- [Author lifecycle decisions](ai-prompts/lifecycle-decisions.md) archives user prompts,
  the final first-lock-wins approval, edit-operation schema and latest idempotency rule.
- [Pasted creation API contract](ai-prompts/creation-api-contract.md) archives the attached
  text used for the route/body/response implementation.
- Assistant checked this branch and corrected the assumption that a settlement/refund
  worker already existed: only persistence fields were present.
- Assistant asked for the durable edit representation and concurrent duplicate rule.
  Author supplied OrderEditOperation and explicitly removed five-minute content detection.
- Key implementation update: “I’ll follow your latest duplicate rule: the same key resumes
  the original creation, and a different key starts a separate request even if the body
  matches. I’ll also add the approved OrderEditOperation table so credit-changing edits
  retain their proposed changes and expected Credit version across restarts.”

### Locations and scope

Order grpc package/scripts, JWT authentication, API DTOs/controllers/routes/app,
User/Supplier adapters, local agreed Credit protobuf and client, creation/edit/lifecycle
services, worker startup/configuration, unit/gRPC/HTTP/PostgreSQL tests, Prisma schema
and new edit-operation migration, .env.example, opt-in compose.lifecycle.yaml,
Order README, root README disclosure, shared root package-lock.json, and these records.
The existing applied migration was not changed. Root package-lock additions preserve
all prior package versions; no teammate manifests, source or shared wire contracts changed.

Credit protobuf copied from origin/feat/credit-implementation; original attribution
comments retained. The source commit is recorded below. Generated code was reviewed
by the assistant, compiled and exercised in tests; no human review is claimed.

### Implemented behavior

POST /orders, PATCH /orders/:id, POST /orders/:id/cancel; USER JWT/ownership enforcement;
nonblank text, positive whole int32 credits, offset-bearing expiry at least one hour
at initial validation, current supplier-open checks; stable-key creation replay/conflict;
credit reservation reconciliation before publication; durable credit edits using
UpdateReservation/expectedVersion; history-preserving cancellation; expiry through pickup;
automatic durable recovery and compensation, initial attempt plus five bounded retries.
Unresolved states stay recorded for reconciliation and are not reported as paid/refunded.

### Verification and limits

Final checks: TypeScript/Prisma build passed; 8 unit/authentication/gRPC tests and
23 dedicated PostgreSQL/HTTP/gRPC lifecycle tests passed (31 total). Docker image
built, both containers healthy, /health returned 200, and Prisma reported both
migrations applied. Opt-in Compose configuration validated. All existing root
lockfile package keys and versions were preserved; git diff --check passed.
The disposable lifecycle test container was removed after verification; the normal
Order stack remains running. Test doubles exist only in tests.
Supplier GetSupplier and the checkout's old Credit RPC handlers remain stubs; the
suite does not certify a full deployed peer-service flow. Acceptance/pickup/delivery,
listing/history UI and operator reconciliation endpoints are not implemented here.

Credit contract source commit: 15bb4cde30de15822d2f4be3a06c85fc5f36edb5
