<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
Scope: Archived the exact Postman demo scenarios, human clarifications and key outputs.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 030.
-->

# Prompt archive — 030

## Exact user prompt

```text
in the postman folder, could you help me create tests that i can run on the spot as a demo to shwocase the credit service logic? i also want shared tests for order and credit, i will list them below



i have a seed script under scripts/seeduser.js to create user accounts, this is a temporary file that is not to be tracked or committed because its only in use until the user credit async workflow is up,



setup: register and log in A (requester), B (courier), C (second courier) and D, who is never seeded. Seed A, B and C with the script. For a re-run, wipe and reseed the databases first.



credit (rest only):

1. get D’s balance and D's history
2. no token and garbage tokens on balance and history methods
3. unknown path
4. get A's balance and A's history
5. Re-run the seed for A. get balance and history for A
6. get history paging with size 1: follow the next-page token to the end, with no repeats and none missed. Also request with no page size and check the default of 50.
7. get history with page size 0, 101, non-number and garbage page token. try getting A's page with B's token



credit (grpc-only):

1. A missing token and a wrong token for services
2. Reserve the same request twice.&#x20;
3. Reserve the same order with a different amount.&#x20;
4. Reserve more than the available credits&#x20;
5. Reserve for a nonexistent account&#x20;
6. Update, for each of these cases:
   - An increase within the available credits&#x20;
   - A decrease in credits.
   - Updating to the amount already held&#x20;
   - Sending the identical update twice&#x20;
   - A stale version&#x20;
   - An increase beyond the available credits&#x20;
   - Updating after release or settle&#x20;
7. Release twice.&#x20;
8. Releasing after settle&#x20;
9. Settle, then settle again with the same courier. settle with a different courier returns REQUEST_CONFLICT. Settling after release . Self-settle and a courier with no account.
10. Settle, restart Credit, then call getReservation.&#x20;
11. getReservation on an unknown order. getBalance on an unknown account. A non-UUID order ID or an empty user ID.



credit + order: check credit balance and history after each one of these

1. A creates order 1 for 4
2. The same request with the same key&#x20;
3. The same key with a different body&#x20;
4. A creates an order for 7. It is above the 6 available but below the 10 total
5. B accepts, picks up and delivers order 1.&#x20;
6. B delivers again.&#x20;
7. A creates order 3 for 2 and cancels it. Reserved goes 2, then 0,&#x20;
8. A creates order 4 for 2.
   - A can’t accept their own order.
   - B accepts, and then C can’t accept.
   - B can’t deliver before pickup.
   - Reserved stays at 2 throughout.
   - Then B picks up and delivers.&#x20;
9. Credit down during create: A creates order 5 for 2 with Credit stopped. Restart Credit and retry with the same key.&#x20;
10. Credit down during deliver: B accepts and picks up order 5, stop Credit, and B delivers. Restart Credit and deliver again.&#x20;
11. Credit down during cancel: A creates order 6 for 2, stop Credit, and A cancels.  Restart Credit and cancel again.&#x20;



i'm also not sure if we can use postman for race condition and concurrency scenarios

like two couriers accepting at the same time, etc.
```

## Clarification exchanges (verbatim)

Question: Order Service is still a scaffold in this checkout. Which implementation should the shared demo tests target—origin/order-core, origin/feature/order-create, or another branch/contract? I can inspect a branch without merging it while building the Credit tests.

Answer:

```text
feature/order-create branch
```

Question: For “try getting A’s page with B’s token,” do you mean send A’s pagination bookmark with B’s login JWT and expect 400? Also, should the REST, direct-gRPC and Order/Credit demos each start with freshly reset accounts? Their mutations otherwise change A’s starting balance.

Answer:

```text
yes send A's bookmark with B's token. yes start with freshly reset accounts
```

Question: The feature/order-create branch says normal startup still lacks User/Supplier adapters, so order creation returns 503 even when Credit is up. Do you have a runnable Order demo setup with those adapters, and which existing supplier ID should the tests use? I can write the shared tests against that branch’s contract while the integration is pending.

Answer:

```text
no we don't have that yet, is it still possible to write the tests first and then modify it later when that is ready? otherwise let me know what order service needs to do and ill let them know
```

## Key assistant responses (verbatim)

I’ll inspect the Postman folder, seed script, and Order/Credit APIs, then build demo tests for the scenarios you listed. I’ll keep the temporary seed script untracked and check how Postman can run the concurrency cases.

Yes—we can write the shared tests now against `feature/order-create` and run them once its dependencies are connected. I’ll label them as pending integration and include a handoff note for Order: wire the existing UserDirectory and SupplierDirectory adapters, configure CreditGateway, and provide a valid supplier fixture.

For the paging demo, I’ll add a preparation step that creates enough history through normal Credit RPCs to exercise multiple pages and the default page size.

## Key output and verification

Four local native Postman v3 YAML collections under postman/collections: 18 REST
request definitions with seed/paging pauses; 44 direct gRPC requests including
restart checkpoint; 29 Order/Credit requests with exact balance/history audits
and three outage/recovery pairs; one concurrent B/C acceptance test. The latter
uses asynchronous HTTP requests, not sequential runner iterations. The Order
contract was inspected at local origin/feature/order-create commit 538ae88,
without merging or changing it. Its User/Supplier adapters remain absent; those
tests are explicitly tests-first and are not claimed to have passed integration.

The preparation helper registers/logs in synthetic A/B/C/D, invokes only the
existing untracked credit-service/scripts/seeduser.js for A/B/C, and checks D is
uninitialized. Reseeding A is checked for unchanged balances/history. Paging
preparation uses normal reserve/release RPCs to create 53 rows, with A at 10/0.
The native REST request loop walks all size-one pages and tests the omitted-size
default with 50 of 53 rows. All generated files have YAML/Python/Markdown
attribution headers; no JSON attribution exception was needed. Existing ignored
postman/.postman rules remain. Added only the explicit temporary seed ignore;
did not modify/stage/commit the seed script. Demo credentials are local-only.

Actual Postman CLI HTTP runs passed 13 baseline, five duplicate-seed and 169 final
paging/validation assertions. Final pagination used native request looping and
59 requests in that phase, with no failures. One early run started before fixture
preparation completed and failed its setup guard; it was rerun after completion.
An intermediate asynchronous subrequest reporter printed response-read warnings
despite passing data assertions; the final native paging run has normal request
output. All four collections passed CLI lint and the official v3 JSON schema.
All 102 generated scripts parse. Both Python helper modules compile.

All 44 gRPC requests/84 assertions were verified against the real Credit service
with a temporary local Postman-script-API adapter, including an actual Credit
process restart while PostgreSQL remained running. The installed Postman CLI
refused native gRPC collection execution without login. No account login, cloud
publication/sync or run reporting was performed. Native Postman gRPC execution
remains explicitly unverified. Order/Credit and concurrency are schema/lint/parse
checked pending the team's adapters and a real active supplier ID.

Verification used a newly created isolated User Service Docker project and only
synthetic Credit fixtures. The temporary User stack/volume, synthetic Credit rows
and used environment files were removed afterward; existing Credit/application
data and the original seed file were preserved. No database wipe, application
implementation, schema, contract, Order branch, commit, push, or remote deployment
was changed by this work. Concurrent human edits in other service files remain.

## Sources/instructions

Read root AGENTS.md and the empty Credit/Order/User AGENTS.md files. Used installed
Postman CLI 1.75.0 help, existing repository service/seed sources, and official
Postman documentation for collection v3/schema, CLI runs, pm.response,
pm.sendRequest and pm.execution. URLs are linked in postman/README.md. No external
implementation code copied, skill/plugin invoked, new project dependency added,
or agent delegation performed. Human review remains pending.
