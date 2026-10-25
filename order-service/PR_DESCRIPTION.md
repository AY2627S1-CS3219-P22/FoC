<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-25 Asia/Singapore.
Scope: Factual PR summary/reviewer commands from implemented code and actual checks.
Human review pending; exact prompt/results: usage-log.md. -->
# Implement Order lifecycle APIs, Credit integration and recovery

## Summary

Adds the Order REST lifecycle and relationship-based queries beyond main's
service scaffold. JWT-authenticated students can create, edit, accept, pick up,
deliver and cancel eligible errands. Order persists lifecycle state and durable
Credit work in PostgreSQL; administrators can retrieve all persisted orders.

Merged main at `2c8a068`. The lockfile conflict is resolved; relative to main,
its only changes are seven Order dependency entries. Teammate service changes
inherited from main are not additional implementations in this PR.

## Merge prerequisites — currently blocked

Main still lacks the agreed shared Credit client methods/receipt fields and
shared Supplier validation exports. The normal Order build currently fails on
these missing contracts. Merge the corresponding teammate contract PRs before
merging this PR or running the commands below successfully:

- Shared Credit: GetReservation, UpdateReservation, versioned reservation
  receipts, totalCredits and the agreed RpcOptions/retry support.
- Shared Supplier: grpcsupplierSchema, isOpenResponseSchema, parseSupplierId.
- For live workflows: the implemented Credit runtime with matching service token.

User outbox and Supplier GetSupplier are now inherited from main. No private
Credit transport or duplicate protobuf is included as a replacement. See
[INTEGRATION_NOTES.md](INTEGRATION_NOTES.md) for the exact contract requirements.

## Implemented APIs

| Endpoint | Access and behavior |
| --- | --- |
| GET /health | Public PostgreSQL health, 200 or 503 |
| POST /orders | USER; JWT requester identity; validated supplier/current opening, text, positive credits, expiry at least one hour away; reserves credits; 201/200 replay/202 pending |
| PATCH /orders/:id | Original requester, unexpired UNASSIGNED order; validates changes; versioned Credit UpdateReservation when reward changes; 200/202 |
| POST /orders/:id/accept | Different authenticated student; UNASSIGNED/unexpired/reserved; records courier, ASSIGNED and acceptedAt |
| POST /orders/:id/pickup | Assigned courier only; unexpired ASSIGNED -> PICKED_UP with pickedUpAt; no credit movement |
| POST /orders/:id/deliver | Assigned courier only; unexpired PICKED_UP -> DELIVERED; settles credits to that courier, 200 confirmed/202 pending |
| POST /orders/:id/cancel | Original requester; unexpired UNASSIGNED only; CANCELLED and credit release, 200 confirmed/202 pending |
| GET /orders?scope=open | USER; unassigned/unexpired orders, excluding own requests |
| GET /orders?scope=requested | USER; own requester orders, including history |
| GET /orders?scope=assigned | USER; own courier orders, including history |
| GET /orders | ADMINISTRATOR; all persisted orders, including completed/cancelled history |

Create/edit require Idempotency-Key. Same key/body resumes or replays; same key
with different body returns 409. Different keys represent separate requests.
Backend checks roles and stored requester/courier relationships. Missing/invalid
JWT returns 401, unauthorized actors 403, invalid input 400, missing order 404
and invalid/conflicting transitions 409.

## Persistence and integrations

- Adds OrderCreation, Order, CreditOperation and OrderEditOperation Prisma models
  and migrations relative to main. The recent d3-demo port adds no further schema.
- Uses shared @foc/grpc Credit transport and per-call x-credit-service-token.
  Validates receipts and reconciles current reservations before completing work.
- Durable creation/edit/refund/settlement recovery: leases, backoff, initial
  attempt plus five retries, and unresolved state retained after exhaustion.
  Explicit ACCOUNT_NOT_FOUND remains retryable within that budget.
- Background expiry cancels overdue UNASSIGNED, ASSIGNED and PICKED_UP orders,
  recording EXPIRY and releasing reserved credits.
- Database row locks serialize conflicting transitions; acceptance is
  first-lock-wins. Pending edits block conflicting acceptance/cancellation.
- Supplier opening checked during creation; pickup/delivery use saved snapshot.
  Missing locationDescription becomes "-". Destination remains a string.
- Order Dockerfile/allowlist support peer manifest relocation and main's .npmrc.
- README/manual testing and AI attribution/usage records included. No demo
  Postman folders, real keys/tokens or local database changes are included.

## Verification performed

- Clean merged-workspace `npm ci --ignore-scripts`: passed.
- Ordinary build: **BLOCKED** by missing teammate shared contracts above.
- Docker build with merged main workspace/.npmrc plus isolated agreed contracts: passed.
- With isolated agreed shared contracts: Order build, 16 unit tests and 61
  PostgreSQL integration tests passed. These are conditional checks, not a
  claim that a clean checkout of this PR currently builds unaided.
- Integration tests use real Order PostgreSQL and test-only gRPC handlers for
  deterministic failures. They cover JWT/role/ownership, validation, idempotency,
  concurrent acceptance/edit/pickup/delivery, expiry, failed and uncertain Credit
  calls, recovery after restart/lease expiry, and no duplicate credit operations.

## Reviewer checks — after dependency PRs land

From the repository root, with Node 22 and Docker Desktop running:

```sh
npm ci
npm run build --workspace @foc/grpc
npm run build --workspace @foc/order-grpc
npm test --workspace @foc/order-grpc
```

Run integration tests against a dedicated disposable database, never a service
or production database:

```sh
docker run --rm -d --name order-pr-test-db \
  -e POSTGRES_USER=order_service \
  -e POSTGRES_PASSWORD=order_service \
  -e POSTGRES_DB=order_service_test_pr \
  -p 127.0.0.1:55450:5432 postgres:16

until docker exec order-pr-test-db pg_isready -U order_service -d order_service_test_pr; do
  sleep 1
done

export TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55450/order_service_test_pr
DATABASE_URL="$TEST_DATABASE_URL" npm run prisma:deploy --workspace @foc/order-grpc
npm run test:integration --workspace @foc/order-grpc

docker rm -f order-pr-test-db
unset TEST_DATABASE_URL
```

Expected: 16 unit tests and 61 integration tests pass. No running User/Supplier/
Credit services are needed for that integration suite.

### Docker startup and live smoke checks

Start User/Supplier/Credit using their own READMEs. Complete Credit migrations,
keep RabbitMQ running for registration events, and use a matching User public
key and Order/Credit service token. Pick a Supplier that is currently open.

```sh
export CREDIT_ORDER_SERVICE_TOKEN=local_order_credit_token
export USER_PUBLIC_KEY_PATH="$PWD/user-service/keys/public.pem"
export ORDER_DATABASE_PORT=55441
export ORDER_HTTP_PORT=33003
export ORDER_GRPC_PORT=55053

docker compose -f order-service/compose.yaml \
  -f order-service/compose.lifecycle.yaml up --build -d --wait
curl -i http://localhost:33003/health
```

Order's Docker startup applies Prisma migrations. With the local overlay, peers
are reached through host.docker.internal at User 50051, Supplier 50052 and Credit
50054. Override the corresponding *_GRPC_ADDR variables if configured differently.

Using two fresh students A/B, verify these API results and Credit balances:

1. Register/login A and B; wait for their Credit accounts to initialize.
2. A creates an order for 3 credits using POST /orders and a unique key.
   Expect UNASSIGNED/201; A's reserved balance increases by 3.
3. Replay the exact request/key: same order, no extra hold. Change body with
   same key: 409. Invalid body: 400. No JWT: 401.
4. A's open listing excludes it; B's includes it; A's requested list includes it.
5. B cannot edit/cancel A's order (403); A cannot accept it (403).
6. A can edit its reward before acceptance; Credit hold adjusts once. B accepts:
   ASSIGNED/200. Subsequent acceptance/edit/manual cancel return 409.
7. B calls pickup with `{}`: PICKED_UP/200 and pickedUpAt. A pickup: 403;
   repeated pickup: 409. Hold remains unchanged.
8. B calls deliver: DELIVERED with SETTLED/200 or durable 202 pending recovery.
   Once settled, A loses the reward and B receives it. Replay does not pay twice.
9. Create a separate UNASSIGNED order; A cancels it. Confirm CANCELLED and
   REFUNDED (or 202 while pending), released hold and retained requester history.
10. USER unscoped GET /orders: 403. An actual administrator token: 200 with all
    statuses. Filtering by requester/status and GET /orders/:id are not implemented.

Request body example (set expiry to at least one hour in the future):

```json
{
  "supplierId": "<currently-open-supplier-id>",
  "destination": "Central Library",
  "requestDetails": "Collect one coffee",
  "credits": 3,
  "expiryTime": "<future ISO timestamp with timezone>"
}
```

Credit outages, lease recovery and concurrency are exercised by the automated
suite. Sequential smoke requests alone do not demonstrate simultaneous races.
