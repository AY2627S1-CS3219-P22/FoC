<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-23 Asia/Singapore.
Scope: Generated live-demo instructions; human review pending; see ../usage-log.md. -->
# Order live demonstration

This is a native Postman YAML collection, with 33 numbered HTTP requests and a
blank local environment template. It targets the implemented d3-demo contract.
The requests create real local demo users, orders and credit reservations.
No database reset, SQL seeding or service shutdown is performed by the scripts.

## Open and prepare

1. Start User, Supplier, Credit, Order and RabbitMQ using
   [POSTMAN_DEMO.md](../POSTMAN_DEMO.md). Credit migrations must be applied first.
2. Open this `order-service/postman` directory in Postman's local file workspace
   (Local View). The requests are under `collections/Order live demo`.
   These are native YAML files, not a legacy JSON collection import.
3. Select `environments/demo.environment.yaml`. If needed, use a local working
   copy outside the repository: scripts save login tokens into the selected
   environment. Never commit or share an environment after running the demo.
4. Confirm URLs. Order defaults to **33003**, not 3003. Change it if your runtime
   uses the default service port.
5. Run folders in order manually. Folder 07 is optional and needs a separately
   obtained administrator token in `adminToken`; registration creates students.

## Run order

| Folder | What to demonstrate |
| --- | --- |
| 01 Accounts | Register A/B with unique synthetic NUS-format emails, then login; scripts save IDs and tokens |
| 02 Readiness | Each new Credit account has 10/0/10; list suppliers |
| 03 Create and validate | Create, replay, conflicting replay, invalid credits, missing JWT, 3-credit hold |
| 04 Visibility | Requester sees their own history, excludes own open order; B sees it; student admin query rejected |
| 05 Edit and accept | Ownership check, increase hold to 4, self-accept rejected, B accepts, repeat/edit/cancel rejected |
| 06 Cancel and refund | Separate 2-credit order, foreign cancellation rejected, requester cancellation returns hold, history retained |
| 07 Optional administrator | Administrator GET /orders includes all statuses |

**Pause in folder 02:** registration initializes Credit asynchronously. If a
balance returns 404, wait and resend it. Both initial balances must pass before
continuing. Inspect User/Credit logs if accounts remain absent.

After listing suppliers, manually set `supplierId` to one that is currently
open. The collection does not automatically choose an arbitrary supplier.

Normal online steps expect 201 for new creation and 200 for successful commands.
A valid 202 pending response intentionally fails that online-path assertion;
it must not be presented as completed. Retain the same key/body and resend the
same request after worker recovery. A completed creation replay returns 200,
so its original new-creation 201 assertion will then fail; use its returned
`order.id` to set `orderId` (or `cancelOrderId`) and verify the appropriate
balance before continuing. Do not generate another key to retry an uncertain
operation. Cancel can also be resent until its response is 200/REFUNDED.

The first request generates `runId` and a fixed expiry two hours ahead. All
creation/edit keys and retry payloads use those fixed values. Clear **all run
state** for another full demo, or select a fresh copy of the blank environment.
Do not rerun registration for the same runId: duplicate registration should 409.
After expiry or token expiry, start a fresh run or login again as appropriate.

## Expected balance sequence for A

Fresh 10/0/10 -> create 10/3/7 -> edit 10/4/6 -> acceptance unchanged ->
second creation 10/6/4 -> second-order refund 10/4/6.
The first assigned order still has a 4-credit hold at the end. The demo does not
reset balances. Use fresh accounts on subsequent runs.

## Deliberate scope

No pickup or individual GET /orders/:id requests are included because those
routes are not implemented. No administrator requester/status query parameters
are invented. Expiry and simultaneous acceptance are covered by the backend
integration suite, not claimed by this sequential live demo. No mocked
settlement or direct SQL state changes are included.

## Regenerate and verification

Run from repository root:

```sh
python3 order-service/postman/generate.py
```

Only Python 3 and Node are required. Regeneration recreates the blank environment;
do not run it against your working environment during a demo. The generator
checks JavaScript syntax using Node. YAML files use JSON syntax (valid YAML)
with a top attribution comment; no PyYAML dependency is required.

Generated shape and script syntax are checked locally. These requests have not
been executed against the deployed services or verified by the Postman runner.

## Postman Web import

Import these two files from `web-import/` using Postman Web's **Import** button:

- `Order-Live-Demo.postman_collection.json`
- `Order-Live-Demo.postman_environment.json`

Select **Order Live Demo - local** as the active environment. Install/start the
Postman Desktop Agent and select it for localhost requests. Keep Docker running.
Run folders 01–06 in order, pausing in folder 02 for account initialization and
to set a currently open `supplierId`. Folder 07 needs your administrator token.
Use synthetic accounts in the web workspace, which can synchronize cloud data.
Never share populated tokens or export them into the repository.

The JSON templates contain no login tokens. Both JSON files are AI-assisted
(ChatGPT/Codex, 2026-10-23 Asia/Singapore); human review pending. The human
approved attribution in the collection description and this README/usage log
because JSON cannot carry header comments. Exact prompt: ../usage-log.md.

Regenerate **only the web templates** (does not read saved environment tokens):

```sh
python3 order-service/postman/export-web.py
```

The exporter preserves all 33 requests and converts beforeRequest/afterResponse
scripts into v2.1 prerequest/test events. Scripts are syntax-checked with Node;
no Postman Web import or live API run has been performed by the agent.

Authentication troubleshooting update (2026-10-23): regenerated Web collections
check referenced student JWTs through User /users/me before protected calls.
With a known synthetic account email/password they login again when needed.
Missing setup reports an explicit error; intentional unauthenticated tests are
unchanged. Import the updated collection to obtain this pre-request check.
Use folder 01 to register/login A and B in a fresh environment. Credit Service
requires its database migrations even when its container is running.
