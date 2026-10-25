<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-25 Asia/Singapore.
Scope: Documented Order-owned port and dependency/validation facts.
Human review pending; exact prompts and results: usage-log.md. -->
# Order functionality integration

The Order-only port was followed by the human-authorized merge of origin/main
(2c8a068) on 2026-10-25. Incoming teammate files remain main baseline changes,
not new implementations for this PR. The sole conflict was package-lock.json;
resolution adds only seven Order dependency entries relative to main. Order
Docker now includes main's .npmrc. Untracked postman 2 remains excluded.

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
Main workspace metadata and Order lock entries are now reconciled. Credit
package relocation/shared contract changes still need the relevant teammate PRs.
Do not copy d3-demo's root lockfile over the merged main workspace layout.

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

PR body and reproducible reviewer steps: [PR_DESCRIPTION.md](PR_DESCRIPTION.md).
