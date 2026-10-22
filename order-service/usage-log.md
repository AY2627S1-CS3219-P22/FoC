<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
Scope: Recorded this change; author review pending. -->

# Order Service AI usage log

## 2026-10-22: Plaintext Credit integration on feature/order-create

Tool: ChatGPT through Codex; exact model identifier not exposed.
Modes: implementation/refactoring, tests, documentation. Human author review pending.

### Exact user prompt

> if it has been implemented, do note that the team is:
> we're dropping TLS between Order and Credit; Credit will only run plaintext gRPC. On feature/order-create, could you remove CREDIT_GRPC_CA_PATH and the loopback/TLS check in configuredCreditGateway.ts (lines 9, 15–17, 20–22, plus the readFileSync import), src/env.ts line 8 and .env.example lines 19–21? Also update the test assertion at creditGateway.test.ts:67 (it expects a TLS error for credit-service:50054) and the TLS/CA text in the README (lines 361–363, 366–370 and 433–434). The service token stays as is.

### Key response and implementation

Confirmed requested paths exist on feature/order-create; switched from clean
order-functionality to that branch. Removed CA setting/file loading and the
loopback/production TLS guard. Gateway always constructs insecure/plaintext gRPC
credentials. Service-token requirement and x-credit-service-token metadata unchanged.
Updated configuration tests to allow credit-service:50054 in development and
production; retained real plaintext RPC token/receipt/retry tests. Updated .env
example and Order README; root README carries this change's AI disclosure.
Previous-branch ignored generated Prisma artifacts were preserved under /private/tmp
rather than included in this branch's changes. No other branch was modified.

Affected files: src/dependencies/configuredCreditGateway.ts, src/env.ts,
.env.example, tests/creditGateway.test.ts, Order README, root README and this log.
Verification: shared gRPC and Order builds passed; test TypeScript checks passed;
all 22 Order tests passed, including plaintext container targets in development
and production, required service token, real plaintext gRPC metadata/receipts,
and transient retry behavior. git diff --check passed. No package/lockfile changes.
