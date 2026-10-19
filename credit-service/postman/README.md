# Credit Service Postman tests

A Postman local workspace with a 21-request gRPC flow for the Credit Service: account
creation, reserve, overspend, reward update, stale edit, completion (twice), cancellation,
and caller permissions. Each request has automatic checks in its Tests tab. Request 01
creates fresh IDs, so the flow can be rerun at any time.

Concurrency (simultaneous requests and races) cannot be shown in Postman, which sends
one request at a time; use `node credit-service/examples/demo.mjs` for those scenarios.

## Setup

1. Start the service: `npm run dev --workspace @foc/credit-grpc` (see the service README).
2. In Postman, open the `credit-service/` folder as a local workspace.
3. Create or select the **Credit local** environment with three variables:

   | Variable | Type | Value |
   | --- | --- | --- |
   | `credit_url` | default | `127.0.0.1:50054` |
   | `user_token` | secret | `CREDIT_USER_SERVICE_TOKEN` from `credit-service/.env` |
   | `order_token` | secret | `CREDIT_ORDER_SERVICE_TOKEN` from `credit-service/.env` |

   Postman saves environment and global values under `postman/environments/` and
   `postman/globals/`. Both are git-ignored so tokens are never committed.
4. Invoke requests **01 → 21 in order**. Each response's Test Results should be green.

Use `127.0.0.1`, not `localhost`: the service listens on IPv4 only.

To call the containerised service, turn on TLS for the requests and add
`credit-service/keys/server-cert.pem` under Settings → Certificates → CA certificates.
