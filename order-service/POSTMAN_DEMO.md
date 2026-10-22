<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22 (Asia/Singapore).
Scope: Generated setup/Postman checks; updated approved User/Supplier merges and retry behavior.
Author review pending. Exact prompt and verification: usage-log.md, Credit entry 046. -->

# Postman demo: Order and Credit

Run from `d3-demo`. This guide distinguishes direct Credit calls from the full
Order workflow. No API/schema/architecture changes are required by this guide.

## 1. What is ready in this checkout

Credit's six gRPC operations and authenticated REST balance/history are implemented.
Order now uses createCreditClient directly from the shared @foc/grpc package.
Order has creation, editing, acceptance, cancellation, expiry and delivery/settlement.

This demo branch now includes main's User transactional outbox and the approved
Supplier gRPC branch. Registration records a durable `user.created` event; its
background dispatcher publishes to Credit's queue. Supplier implements
`GetSupplier` and `IsOpen`; its Compose file has no merge markers. Order retains
available Supplier fields and stores `"-"` for an absent location description.

Order has no pickup endpoint. A complete accept/pickup/deliver REST journey
cannot be presented from this branch. Direct Credit settlement can be shown
independently of Order pickup.

Credit `NOT_FOUND` with `ACCOUNT_NOT_FOUND` stays pending within the existing
initial attempt plus five retries. After exhaustion it requires manual
reconciliation; other NOT_FOUND reasons retain their existing handling.

The Credit-only demo below works without Supplier or Order. It uses synthetic
reservation IDs; those reservations are not Order Service rows. Use fresh users
for the later full Order demo so balance expectations start at 10 again.

## 2. Start prerequisites

Open Docker Desktop. In a terminal:

```sh
cd /Users/euniceng/Desktop/FoC
export DEMO_REPO="$PWD"
nvm use 22.22.0
npm ci
npm run build --workspace @foc/grpc --workspace @foc/messaging --workspace @foc/credit-grpc --workspace @foc/order-grpc
```

User needs its existing signing-key pair. If neither file exists, generate it:

```sh
if [ ! -e user-service/keys/private.pem ] && [ ! -e user-service/keys/public.pem ]; then
  npm --prefix user-service run keys:generate
fi
```

If only one key exists, repair the pair before proceeding. Do not regenerate
working keys: User, Order and Credit must use matching signing/verification keys.

Start RabbitMQ, then User; do not register demo users until Credit is migrated
and its listener is ready:

```sh
docker compose -f shared/messaging/compose.yaml up -d --wait
# Create only if missing; keep existing local settings.
[ -f user-service/.env ] || cp user-service/.env.example user-service/.env
# Ensure POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB are set in that file.
docker compose --env-file user-service/.env -f user-service/compose.yaml \
  -f user-service/compose.override.yaml up --build -d --wait
curl -i http://localhost:3001/health
```

Ports needed: User 3001/50051/5432, RabbitMQ 5672/15672, Credit 3004/50054,
Credit PostgreSQL 5434. Stop another conflicting local instance normally if
those ports are already occupied.

## 3. Start Credit and apply migrations

In the same terminal:

```sh
export CREDIT_DEMO_PROJECT=foc-credit-postman
export CREDIT_POSTGRES_PORT=5434
export CREDIT_ORDER_SERVICE_TOKEN=local_order_credit_token
export CREDIT_JWT_PUBLIC_KEY_FILE="$DEMO_REPO/user-service/keys/public.pem"

cc() {
  docker compose -p "$CREDIT_DEMO_PROJECT" \
    --env-file "$DEMO_REPO/credit-service/.env.docker.example" \
    -f "$DEMO_REPO/credit-service/compose.yaml" "$@"
}

cc up --build -d --wait
```

The dedicated Compose project has its own Credit volume. On its **first, fresh
run only**, apply all nine migrations in filename order:

```sh
migrate_fresh_credit_demo() {
  for migration in "$DEMO_REPO"/credit-service/migrations/[0-9]*.sql; do
    cc exec -T credit-service npm run db:migrate -- "migrations/${migration##*/}" || return
  done
}
migrate_fresh_credit_demo
```

This runner has no migration ledger. For an existing database, apply only missing
migrations as instructed by Credit's README. Do not rerun initial SQL blindly.
Migrations must complete before publishing registration events.

```sh
curl -i http://localhost:3004/health
cc logs --tail=40 credit-service
```

Expect HTTP 200, `db: "up"`, and `listener: "up"`. The listener flag reports
startup only. A 200 with listener down does not establish event consumption.
If consumer startup failed, fix RabbitMQ reachability and run
`cc restart credit-service`; it makes one consumer startup attempt per process.

## 4. Prepare a Postman environment

Create a local environment and select it. Add:

| Variable | Value |
| --- | --- |
| userBase | http://localhost:3001 |
| creditBase | http://localhost:3004 |
| orderBase | http://localhost:33003 |
| creditGrpc | localhost:50054 |
| creditServiceToken | local_order_credit_token |
| demoPassword | DemoPass1! (local demo example) |
| demoRun | a fresh timestamp/run label |
| requesterId / courierId | filled from registration responses |
| requesterToken / courierToken | filled from login responses |
| creditOrderA / creditOrderB | two different fresh lowercase UUIDs |

A REST `GET {{creditBase}}/health` request can use this post-response script to
initialize run variables once. Clear them intentionally for a new demo run:

```javascript
if (!pm.environment.get('demoRun')) pm.environment.set('demoRun', String(Date.now()));
for (const name of ['creditOrderA', 'creditOrderB']) {
  if (!pm.environment.get(name)) pm.environment.set(name, pm.variables.replaceIn('{{$guid}}').toLowerCase());
}
pm.test('Credit database is up', () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().db).to.equal('up');
});
```

Use Bearer Token auth with `{{requesterToken}}` for requester REST requests,
and `{{courierToken}}` for courier requests. Registration/login/health have no
bearer requirement. Keep real credentials/tokens local; do not export them with
shared collections. User access tokens expire; repeat login if necessary.

## 5. Register and log in as two students

POST `{{userBase}}/users/register`, Body -> raw -> JSON:

```json
{
  "firstName": "Demo",
  "lastName": "Requester",
  "username": "demoreq{{demoRun}}",
  "email": "demo.req.{{demoRun}}@u.nus.edu",
  "password": "{{demoPassword}}"
}
```

Post-response script:

```javascript
pm.response.to.have.status(201);
pm.environment.set('requesterId', pm.response.json().user.id);
```

Duplicate the request for the courier: lastName Courier, username
`democourier{{demoRun}}`, email `demo.courier.{{demoRun}}@u.nus.edu`.
Save its returned ID as `courierId` instead.

POST `{{userBase}}/users/login`:

```json
{
  "email": "demo.req.{{demoRun}}@u.nus.edu",
  "password": "{{demoPassword}}"
}
```

Post-response script:

```javascript
pm.response.to.have.status(200);
pm.environment.set('requesterToken', pm.response.json().token);
```

Repeat for the courier email, saving `courierToken`.

## 6. Initialize demo Credit accounts

Registration now publishes through User's durable outbox. Wait briefly, then
check both users' Credit balances. If an account remains absent, inspect User
outbox/dispatcher logs and Credit listener logs before proceeding.

The following is an **optional manual event/replay diagnostic**, not the normal
registration path. To demonstrate consumer idempotency, copy the registered
user IDs into this terminal:

```sh
export DEMO_REQUESTER_ID='paste-requesterId-here'
export DEMO_COURIER_ID='paste-courierId-here'

node <<'NODE'
const { randomUUID } = require('node:crypto');
const { RabbitMQClient, CREDIT_USER_QUEUE } = require('@foc/messaging');
(async () => {
  const broker = new RabbitMQClient({
    url: 'amqp://guest:guest@localhost:5672',
    prefetch: 10,
    serviceName: 'manual-credit-demo-publisher',
    logDir: '/tmp/foc-postman-publisher',
  });
  try {
    await broker.connect();
    for (const userId of [process.env.DEMO_REQUESTER_ID, process.env.DEMO_COURIER_ID]) {
      if (!userId || userId.startsWith('paste-')) throw new Error('Set registered demo user IDs first');
      const eventId = randomUUID();
      const sent = await broker.publishToQueue(CREDIT_USER_QUEUE, {
        type: 'user.created', eventId, occurredAt: new Date().toISOString(), userId,
      }, eventId);
      if (!sent) throw new Error('Event publication was not confirmed');
    }
  } finally { await broker.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
NODE
```

This publishes the agreed event into Credit's actual queue using the shared
publisher. It demonstrates Credit event consumption; it is not proof of User's
registration publisher. No InitCredits HTTP/gRPC endpoint exists. No direct SQL
balance modifications are needed.

GET `{{creditBase}}/credits/me/balance` with each user's bearer token.
For each fresh user expect:

```json
{ "userId": "...", "totalCredits": 10, "reservedCredits": 0, "availableCredits": 10 }
```

GET `{{creditBase}}/credits/me/history?pageSize=50`: expect one INITIAL_GRANT.
If testing optional manual event replay for these same users: balances remain 10 and
history still has one INITIAL_GRANT per user. Account initialization is async;
poll balance briefly after publishing. A 404 means the account is not initialized.

## 7. Configure Postman gRPC

Create a gRPC request with server `{{creditGrpc}}`. Disable TLS for this local
plaintext endpoint. Import this local definition; reflection is not required:

`shared/grpc/proto/credit.proto`

Select `credit.CreditService` and the desired RPC. For every RPC, add metadata:

```text
x-credit-service-token: {{creditServiceToken}}
```

Use the protobuf field names below in the message editor. REST calls use the
User bearer token; these internal RPCs use the service-token metadata instead.
There is no caller-supplied Idempotency-Key on Credit RPCs: Credit derives its
operation keys from order ID and, for updates, expected version.

## 8. Direct Credit demo: hold, edit, release, transfer

Use fresh accounts at (total 10, reserved 0, available 10).

### A. Reserve and edit a hold

**ReserveCredits**:

```json
{ "order_id": "{{creditOrderA}}", "requester_id": "{{requesterId}}", "amount": 4 }
```

Expect OK, RESERVED, amount 4, version 1. Requester balance is **10 / 4 / 6**
(total / reserved / available). Repeat the identical request: no additional hold
or history entry. Reusing this order ID with a different amount fails with
FAILED_PRECONDITION/REQUEST_CONFLICT.

**UpdateReservation**, increase:

```json
{ "order_id": "{{creditOrderA}}", "amount": 6, "expected_version": 1 }
```

Expect amount 6/version 2 and balance **10 / 6 / 4**. Only the extra 2 is held.
Repeat identically: unchanged balances/version/history.

**UpdateReservation**, insufficient funds:

```json
{ "order_id": "{{creditOrderA}}", "amount": 11, "expected_version": 2 }
```

Expect FAILED_PRECONDITION with INSUFFICIENT_CREDITS; balance remains 10/6/4.
A failed call does not consume a successful-update idempotency result.

**UpdateReservation**, decrease:

```json
{ "order_id": "{{creditOrderA}}", "amount": 3, "expected_version": 2 }
```

Expect amount 3/version 3 and balance **10 / 3 / 7**. The excess 3 is released.
Use amount 5 and expected_version 99 to show VERSION_CONFLICT without mutation.

**GetReservation**:

```json
{ "order_id": "{{creditOrderA}}" }
```

Expect the **current** amount 3/version 3. A repeated original ReserveCredits
call can replay its old amount 4/version 1 snapshot, while the current balance
stays 10/3/7. GetReservation is the reconciliation read.

### B. Release the hold

**ReleaseCredits**:

```json
{ "order_id": "{{creditOrderA}}" }
```

Expect RELEASED/version 4 and requester balance **10 / 0 / 10**. Total credits
are unchanged. Repeat: no additional release/history. Update or settle this
released reservation: FAILED_PRECONDITION/INVALID_STATE. Use a fresh order ID
for another reservation; released order IDs cannot be repurposed.

### C. Settle to the courier

**ReserveCredits** using the second order ID:

```json
{ "order_id": "{{creditOrderB}}", "requester_id": "{{requesterId}}", "amount": 5 }
```

Requester balance: **10 / 5 / 5**.

**SettleCredits**:

```json
{ "order_id": "{{creditOrderB}}", "courier_id": "{{courierId}}" }
```

Expect SETTLED with the correct courier and amount 5.

| Account | Total | Reserved | Available |
| --- | ---: | ---: | ---: |
| Requester | 5 | 0 | 5 |
| Courier | 15 | 0 | 15 |

Repeat the identical settlement: no second transfer. Inspect history:
requester has one TRANSFER_OUT (-5 total, -5 reserved); courier has one
TRANSFER_IN (+5 total, 0 reserved). Release after settlement is rejected.
GetReservation confirms current SETTLED/courier/version.

Credit validates balances and settlement identity constraints. Assignment to
an actual errand is validated by Order, so these synthetic Credit-only calls
must not be described as a full Order acceptance/delivery demonstration.

### D. Failure checks

| Test | Expected result |
| --- | --- |
| Missing/wrong gRPC service token | UNAUTHENTICATED; no mutation |
| Invalid UUID, amount 0/negative/fractional/outside int32 | Invalid input; no mutation (editor may reject invalid protobuf numbers before sending) |
| Missing requester/courier Credit account | NOT_FOUND; no partial movement |
| Settle an active hold to its own requester | FAILED_PRECONDITION/INVALID_STATE; unchanged balances |
| Update with expected version 99 | FAILED_PRECONDITION/VERSION_CONFLICT |
| Same successful update key/version, changed amount | FAILED_PRECONDITION/REQUEST_CONFLICT |
| Missing/invalid REST bearer token | HTTP 401 |
| Invalid history pageSize/bookmark | HTTP 400 |

Use fresh active reservations for failure cases that require them. Verify
GetReservation, balances and history after each failure. Failed operations must
not alter totals, holds, versions or history.

For a funding concurrency check after the settlement above, requester has 5
available. Send two ReserveCredits requests for different fresh order IDs,
amount 3 each. Exactly one can succeed; the other is insufficient, leaving
5 total / 3 reserved / 2 available. Release the successful hold afterwards.
Use the automated concurrency suite for reproducible simultaneous execution.

## 9. Order-to-Credit checks

Use a fresh requester/courier pair initialized as above. Do not mix synthetic
Credit-only reservation IDs with persisted Order IDs. Start the working Supplier
REST/gRPC services on 3002/50052 first; select a supplier that is open now:

```sh
docker compose -f supplier-service/compose.yaml up --build -d --wait
curl -i http://localhost:3002/suppliers
```

Supplier uses its local seeded database on 54332. Its REST and gRPC image
builds use the repository root so the shared gRPC package link resolves.

Start Order from this repo with its authenticated lifecycle overlay:

```sh
export CREDIT_ORDER_SERVICE_TOKEN=local_order_credit_token
export USER_PUBLIC_KEY_PATH="$DEMO_REPO/user-service/keys/public.pem"
export ORDER_DATABASE_PORT=55441
export ORDER_HTTP_PORT=33003
export ORDER_GRPC_PORT=55053

docker compose -f order-service/compose.yaml \
  -f order-service/compose.lifecycle.yaml up --build -d --wait
curl -i http://localhost:33003/health
```

In Postman set `supplierId` to a real supplier ID string. For POST
`{{orderBase}}/orders`, use requester Bearer auth and header
`Idempotency-Key: {{createKey}}`. Add this pre-request script:

```javascript
if (!pm.environment.get('createBody')) {
  pm.environment.set('createKey', pm.variables.replaceIn('{{$guid}}'));
  pm.environment.set('createBody', JSON.stringify({
    supplierId: pm.environment.get('supplierId'),
    destination: 'PGP', requestDetails: 'Demo coffee', credits: 4,
    expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  }));
}
```

Raw JSON body:

```text
{{createBody}}
```

On success, save response `order.id` as `orderId`. On 202 save `creationId` and
keep the original body/key for retry. Do not regenerate the expiry on retries.
Clear createBody/createKey only when intentionally starting another logical order.

| Action | Expected Order result | Expected requester credits from fresh 10 |
| --- | --- | --- |
| Create reward 4 | 201, UNASSIGNED | 10 total / 4 reserved / 6 available |
| Same key and body | 200 replay, same order ID | Unchanged; one reservation |
| Same key, different body | 409 | Unchanged |
| PATCH reward 6 with new edit key | 200, updated order | 10 / 6 / 4 |
| PATCH reward 11 with another key | 409, old order unchanged | Still 10 / 6 / 4 |
| PATCH reward 3 with another key | 200 | 10 / 3 / 7 |
| Text-only PATCH | 200 | Unchanged reservation amount/version |
| Cancel as another user | 403 | Unchanged |
| Cancel as requester while UNASSIGNED | 200 REFUNDED or 202 REFUND_PENDING | Eventually 10 / 0 / 10 |

PATCH URL is `{{orderBase}}/orders/{{orderId}}`, JSON body e.g. `{ "credits": 6 }`,
requester Bearer auth and an Idempotency-Key unique to that logical edit.
Retain the edit body/key when retrying uncertain edits.

Use a separate order to demonstrate acceptance and restrictions:

- Requester acceptance is 403; courier acceptance is 200 ASSIGNED.
- Already assigned acceptance is 409; editing/manual requester cancellation is 409.
- Available listing uses `?scope=open` and excludes the caller's own orders.
- Own requests/courier history use `?scope=requested` / `?scope=assigned`.
- Deliver requires PICKED_UP and the assigned USER courier. Without a pickup
  implementation, an ASSIGNED order correctly returns 409 for delivery.
- For an existing valid PICKED_UP order, deliver returns 200 when SETTLED or 202
  DELIVERED/SETTLEMENT_PENDING. Credits are not confirmed paid until SETTLED.
- New creation expiry must be at least one hour ahead. Immediate expiry through
  a newly created order cannot be shown; use the existing automated expiry tests
  or an appropriately aged demo order. Do not add a fake expiry API.

## 10. Show unavailable Credit and recovery

For this Order-level check, Supplier and User must already work. Use another
fresh logical create request (fresh body/key), then stop Credit briefly:

```sh
cc stop credit-service
```

Submit POST /orders. Expect 202 after durable creation recording; no successful
Order row or confirmed hold is claimed. Resume Credit promptly:

```sh
cc start credit-service
```

Retry the exact saved body/key, and refresh requested orders/GetReservation.
Backend recovery continues without Postman. Eventually one order/reservation
appears if Credit and supplier remain valid. The agreed retry budget is the
initial attempt plus five retries (5, 15, 45, 135, 135 seconds); stop/resume within
that window. Permanent business rejection is not automatically retried.

Cancellation/edit/delivery uncertainty similarly remains pending until matching
current Credit state is confirmed. Replay must not duplicate holds/transfers.

## 11. REST Postman assertions

On a balance response, add:

```javascript
pm.response.to.have.status(200);
const balance = pm.response.json();
pm.test('Available = total minus reserved', () => {
  pm.expect(balance.availableCredits).to.equal(balance.totalCredits - balance.reservedCredits);
  pm.expect(balance.reservedCredits).to.be.at.least(0);
  pm.expect(balance.availableCredits).to.be.at.least(0);
});
```

For history use `pageSize=2`, then copy returned nextPageToken to pageToken on the
next request. Compare entry IDs between pages; do not regenerate or interpret the
bookmark as a sequence number. Response has entries and nextPageToken. Use both
requester and courier tokens to verify each sees only their own history.

## 12. Stop without deleting data

```sh
cc down
```

Stop the other stacks with their corresponding Compose files when finished.
Avoid volume deletion if you want to keep demo users/history. This guide does
not run destructive reset commands. Compose uses each service's existing port configuration.

## References and disclosure

Sources: [Credit README](../credit-service/README.md),
[User README](../user-service/README.md), [Order README](README.md),
[manual integration walkthrough](MANUAL_TESTING.md), implemented REST/gRPC
handlers and shared event contracts. AI assistance and actual verification are
recorded in [usage-log.md](usage-log.md) and Credit usage-log entry 046. Human
review remains pending.
