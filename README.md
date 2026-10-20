<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-19–2026-10-20 (Asia/Singapore).
Scope: Added and updated the final AI Use Summary section; existing project content was not generated in these exchanges.
Author review: Pending human review; no human validation is claimed.
Prompts and key responses: credit-service/ai/usage-log.md, entries 001–012.
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

This disclosure covers the assistance recorded from 2026-10-19 on the
`feat/credit-implementation` branch. Earlier or other team AI usage has not yet
been supplied for this summary.

- **Tool and modes:** OpenAI Codex (model: GPT-6), documentation generation,
  refactoring/formatting, Docker configuration boilerplate, and implementation
  and integration tests for the human-specified SQL schema, migration tooling,
  shared-contract alignment, debugging a stale transport-test assertion, and
  explaining the human-specified saved-response replay rule.
- **Scope so far:** Set up the usage log, archive the user's exact instructions,
  document repository AI-use rules, and add this disclosure. Moved the AI records
  to `credit-service/ai/` at the user's request. Archived the human's supplied
  requirements/design and added local Docker/PostgreSQL 17 configuration for the
  existing gRPC scaffold. Recorded the human's confirmed table names, column
  rules, deferred archival scope, `pg`/SQL migration choice, and idempotency flow.
  Implemented the human-specified four-table initial SQL migration, signed history
  deltas, and supplied defaults, with a transactional SQL-file CLI and PostgreSQL
  integration tests. Applied the human-requested requester/status alignment,
  uppercase status confirmation, and existing credit-message field updates;
  regenerated the shared types. Recorded the human's nine-method RPC list,
  prepared its five new request messages, and restored the external `amount`
  field as specified. Added reservation update/lookup wrappers and unimplemented
  handlers, exact human-specified response shapes, and full-table history-entry
  messages. Removed caller keys following the human's internal-generation decision.
  Added both history RPCs with a shared page/entry shape and recorded the human's
  deterministic-key locking flow. Completed all nine RPC declarations, client
  wrappers, and unimplemented handlers with the human's exact initialization
  payload, SHA-256 confirmation, and duplicate saved-success replay rule.
  Credit business operations remain unimplemented. The human approved attributing
  JSON manifest/lockfile changes in the
  [credit-service README](credit-service/README.md#attribution-for-json-files) and usage log.
- **Boundaries:** No requirements prioritization, backlog/sprint planning,
  architecture/design decisions, or decision rationales were generated in these
  exchanges. Requirements priorities and planned sprints in the archived
  attachments were supplied by the human. Implementation assistance requires
  human-finalized requirements and architecture.
- **Prompts and key exchanges:** See [the credit-service usage log](credit-service/ai/usage-log.md)
  and its linked verbatim prompt archives.
- **Verification and author review:** Codex checked repository status,
  documentation links, the full workspace build, Compose configuration, ten
  migration/schema tests against PostgreSQL 17, and eight shared transport and
  contract tests.
  Container verification results are recorded in the service log. Human review
  and validation are pending; agent checks do not establish author approval.
- **Sources and licensing:** Consulted the [official PostgreSQL image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md),
  [Docker Compose startup documentation](https://docs.docker.com/compose/how-tos/startup-order/),
  [node-postgres documentation](https://node-postgres.com/features/transactions),
  [PostgreSQL 17 constraints](https://www.postgresql.org/docs/17/ddl-constraints.html),
  [integer types](https://www.postgresql.org/docs/17/datatype-numeric.html),
  [UUID generation](https://www.postgresql.org/docs/17/functions-uuid.html),
  [column defaults](https://www.postgresql.org/docs/17/ddl-default.html),
  [ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html), and
  [Protobuf message updates](https://protobuf.dev/programming-guides/proto3/#updating),
  [Stripe API v1 saved-response replay](https://docs.stripe.com/api/idempotent_requests),
  and [Node.js hash API documentation](https://nodejs.org/api/crypto.html#cryptogethashes).
  No third-party implementation code was copied. Human authors remain responsible
  for checking generated implementation against assignment and licensing
  requirements.
- **Submission tasks pending:** Human authors must confirm review and team AI-use
  norms, include all agent/skill instructions used, complete the shared history,
  and add a link to this README in the submission slide deck.
