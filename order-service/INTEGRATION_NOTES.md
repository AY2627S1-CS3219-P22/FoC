<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-24 Asia/Singapore.
Scope: Documented Order-owned port and dependency/validation facts.
Human review pending; exact prompts and results: usage-log.md. -->
# Order functionality integration

Only Order source/tests/Docker/docs and required root AI summary were changed.
Credit, User, Supplier, shared packages and root package/lock files were not
merged or edited. Existing untracked postman 2 files remain untouched.

## Required teammate contracts before a normal build

Current branch's shared Credit client lacks GetReservation/UpdateReservation,
versioned receipts and totalCredits. Current shared index also lacks Supplier
validation exports. Order requires the agreed contracts present on d3-demo:

- `@foc/grpc`: createCreditClient with getBalance, getReservation, reserveCredits,
  updateReservation, releaseCredits, settleCredits, RpcOptions metadata/deadline/
  retry support; reservationId/version and balance totalCredits fields.
- Shared Supplier: grpcsupplierSchema, isOpenResponseSchema, parseSupplierId.
- Credit runtime: plaintext gRPC, x-credit-service-token and reason trailers,
  atomic versioned reservation adjustment and idempotent lifecycle operations.
- Supplier runtime: working GetSupplier/IsOpen. Missing description is "-";
  existing Order destination/pickupLocation string schema is preserved.
- User runtime: GetPublicProfile and compatible JWT signing key. user.created
  event/outbox initializes Credit accounts asynchronously; this is in teammate PRs.

Until shared contract PRs land, the ordinary Order build fails on missing
methods/exports. No private replacement client or stub implementation is added.
After teammate merges reconcile the root workspace/lockfile in that integration;
they were deliberately not copied from d3-demo here.

## Order changes included

Shared Credit transport adoption and per-call token options for all workflows;
Order-local response validation; ACCOUNT_NOT_FOUND bounded recovery; Supplier
validation/description fallback; assigned-courier pickup; updated tests.
No Order schema/migration change. No Postman/demo-only artifacts added.

Order Dockerfile copies peer directories through its strict manifest allowlist,
supporting the old and relocated package paths. Other service source, private
keys, node_modules and .env files stay outside its build context. Build with
repository-root context after required shared contracts are available.

## Validation scope

An isolated temporary copy of d3-demo shared/grpc plus User proto supplied the
agreed contracts for build/tests. Teammate tracked files were not changed. A
short-lived ignored node_modules override was used for that verification, then
removed; it is not a permanent dependency workaround.

Order build, 16 unit tests and 61 PostgreSQL integration tests passed using the
agreed temporary contracts. Integration database was disposable. Docker check
passed in isolated contexts for both current and relocated workspace metadata
layouts, each supplied with the agreed shared contracts. Details are in usage-log.md. Tests use real PostgreSQL and test-only gRPC
ledger handlers; this port did not restart any running demo service or claim a
new deployed cross-service verification.
