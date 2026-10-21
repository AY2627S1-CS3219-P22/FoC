<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-19–2026-10-21 (Asia/Singapore).
Scope: Added and updated the final AI Use Summary section; existing project content was not generated in these exchanges.
Author review: Pending human review; no human validation is claimed.
Prompts and key responses: credit-service/ai/usage-log.md, entries 001–028.
-->

# CS3219 — Software Design and Architecture (AY2627 Sem 1)

## Friend on Campus (FoC)

**Friend on Campus (FoC)** is a peer-to-peer campus errand platform where
students can request items to be collected from stores or facilities on
campus, and other students can fulfil (and deliver) those requests. The
platform runs on a closed credit economy — credits cannot be bought,
withdrawn, or exchanged for money, and only circulate within the platform.

---

## Team Members

| Name | Role |
| ----- | ----- |
| Eunice | Order Service |
| Jade | User Service |
| Karthika | Credit Service |
| Maliha | UI |
|Sanya | Supplier Service |

---

## Repository Structure

This repository follows a **one-service-per-folder** structure: each
microservice (`user-service/`, `supplier-service/`, `order-service/`,
`credit-service/`) lives in its own top-level folder.

```text
.
├── user-service/
├── supplier-service/
├── order-service/
├── credit-service/
├── <n2h-service>/
└── README.md
```

- Any **nice-to-have (N2H)** feature that warrants its own service should
  be added as an **additional folder** at the same level, following the
  same per-service structure.
- Files for agentic coding tools (e.g. agent configs, prompts, skills)
  may be added as needed, but must still **respect the
  one-service-per-folder skeleton** for core implementation.

## Local service ports

Use these reserved ports for local development. REST and gRPC ports are kept
the same inside and outside containers to make service configuration predictable.

| Service | REST | gRPC |
| --- | ---: | ---: |
| User service | 3001 | 50051 |
| Supplier service | 3002 | 50052 |
| Order service | 3003 (reserved) | 50053 |
| Credit service | 3004 (reserved) | 50054 |

PostgreSQL containers continue to listen on `5432` internally. Host mappings
may differ when databases share a machine, for example supplier Postgres uses
`54332:5432`. Container-to-container calls should use service names and the
internal port; host processes should use `localhost` and the published host
port. Reserved REST ports prevent future collisions when APIs are added.

---

## AI Use Summary

This covers assistance recorded from 2026-10-19 on feat/credit-implementation.
Earlier or other team usage has not yet been supplied for this summary.

- **Tool and modes:** OpenAI Codex (GPT-6), bounded requirements interpretation/
  formatting, implementation after human design finalization, boilerplate,
  debugging/testing, refactoring, documentation, and explanations.
- **Scope:** Repository AI-use rules and service-local logs; archiving the human's
  requirements and design; Docker/PostgreSQL 17 setup; human-specified SQL schema,
  six migrations and pg tooling; shared credit proto/client/generated types;
  replacement of InitCredits RPC with the internal user.created allocation
  callback; account/reservation/history/idempotency repositories; initialization,
  balance/reservation reads, reserve/update/release/settle transactions; specified
  SHA-256 request and advisory-lock encoding; history label/identity/index changes;
  order-history RPC removal; strict user-history sequence bookmarks; order-only
  authenticated gRPC with reason trailers/TLS configuration; own-balance/history
  REST with RS256 subject authentication; concurrency/rollback/authentication/
  paging tests; the human-requested service-root workspace/source relocation;
  correction of the unshared migration's history spelling; explicit validation
  errors and generic logged internal errors; REST route matching/authentication
  corrections and documented wrong-method behavior; restored balance user IDs
  and full-reservation lookup responses; bounded shared Credit client retries
  with client/per-call settings and one overall deadline; no-write same-courier
  settlement fallback and different-courier conflicts when retry records are absent;
  corresponding docs and disclosures. RabbitMQ startup and User
  Service publication are assigned to teammates and not wired by this work.
  Credit retries use the human's three-attempt, 1,300 ms defaults and specified
  growing/capped/half-base jitter; other service clients retain their behavior.
- **Boundaries:** Requirements, schema, architecture, interfaces, access policies,
  locking, and pagination definitions came from the human authors. No requirements
  prioritization, backlog/sprint planning, architecture/design decisions, decision
  rationales, trade-off analyses, or risk justifications were generated.
- **Prompts and key exchanges:** [credit-service/ai/usage-log.md](credit-service/ai/usage-log.md)
  links exact prompts and key outputs for entries 001–028. The latest exchange
  records the human-defined settled-reservation fallback and regression checks.
  Entry 027 records the shared Credit retry settings and checks.
  Entry 026 records balance user IDs and full Reservation
  lookup responses for Order Service integration.
  All credit-service AI records are under that service. Affected files carry
  attribution comments.
  The human approved the [service README attribution table](credit-service/README.md#attribution-for-json-files)
  for comment-free package.json/package-lock.json changes.
- **Verification and review:** Full workspace build, 77 credit tests against
  PostgreSQL/local listeners, and 51 shared contract/transport/retry tests passed,
  with zero failures/skips. A scoped Node report from exchange 022, before the
  layout relocation, for implemented credit core/API
  source reported 98.29% lines/94.44% branches; startup/env/generated code was
  excluded. Migration 006 is applied locally. Earlier Docker build/start and
  no-write runtime authentication/trailer checks passed on ports 3004/50054. Prior checks
  remain in the log. Human review and validation are pending; agent checks do
  not establish author approval.
- **Sources/licensing:** Consulted official [PostgreSQL 17](https://www.postgresql.org/docs/17/index.html),
  [PostgreSQL Docker image](https://github.com/docker-library/docs/blob/master/postgres/README.md),
  [Compose startup](https://docs.docker.com/compose/how-tos/startup-order/),
  [node-postgres](https://node-postgres.com/features/transactions),
  [Protobuf updates](https://protobuf.dev/programming-guides/proto3/#updating),
  [Node crypto](https://nodejs.org/api/crypto.html),
  [jsonwebtoken verification](https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback),
  [gRPC authentication](https://grpc.io/docs/guides/auth/), and the earlier
  [Stripe saved-response explanation](https://docs.stripe.com/api/idempotent_requests).
  Specific consulted pages appear in the service log. No third-party implementation
  code was copied. Authors remain responsible for assignment/licensing validation.
- **Submission tasks:** Human authors must review outputs, confirm team AI norms,
  consolidate other team usage, include agent/skill instructions used, and link
  this README from the submission slide deck. Root AGENTS.md and the existing
  credit-service/AGENTS.md are in the repository; no skills were invoked here.
