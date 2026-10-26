<!--
AI Assistance Disclosure: OpenAI Codex (GPT-6), 2026-10-19–2026-10-26 (Asia/Singapore).
Mode/scope: Credit-service implementation support and project disclosure documentation.
Review: Earlier reviews are logged; latest documentation changes await human review.
Exact prompts, key responses and checks: credit-service/ai/usage-log.md, entries 001–045.
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
| Credit service | 3004 | 50054 |

PostgreSQL containers continue to listen on `5432` internally. Host mappings
may differ when databases share a machine, for example supplier Postgres uses
`54332:5432`. Container-to-container calls should use service names and the
internal port; host processes should use `localhost` and the published host
port. Reserved REST ports prevent future collisions when APIs are added.

---

## AI Use Summary

This summary covers recorded assistance on feat/credit-implementation from
2026-10-19. Other team members' usage must be consolidated by the authors.

- **Tool and modes:** OpenAI Codex (GPT-6), implementation after human design
  finalization, bounded requirements interpretation/formatting, boilerplate,
  debugging, tests, refactoring, documentation and explanations.
- **Scope:** Credit's PostgreSQL schema and ten migrations; domain/repository/
  service implementation; atomic initialization, reservation, update, release and
  settlement; gRPC contracts/client retries and service-token authentication;
  authenticated own-balance/history REST with entry-ID bookmarks; RabbitMQ consumer
  integration; Docker/workspace setup; health reporting; tests, local demo
  preparation and attribution records; removal of idempotency user/timestamp
  columns and corresponding repository/test refactoring. The [service README](credit-service/README.md)
  documents current interfaces, behavior and setup.
- **Human decisions:** Requirements, architecture, schema, interfaces, policies,
  locking, pagination and security changes came from the human authors. No
  requirements prioritization, backlog/sprint planning, design decisions or
  decision rationales were generated.
- **Prompts and key responses:** Exact exchanges, affected files, recorded reviews
  and actual checks are in [credit-service/ai/usage-log.md](credit-service/ai/usage-log.md),
  entries 001–045. Attribution comments identify AI-influenced files. The approved
  [JSON attribution table](credit-service/README.md#attribution-for-json-files)
  covers formats that cannot contain comments.
- **Verification:** The latest implementation run passed the Credit build and
  103 Credit checks after the idempotency refactor, including scoped seeded ledger
  invariants, entry-ID paging and preservation/replay of pre-migration results.
  All seven live-listener checks also passed against a disposable broker and the
  new schema. Migration 010 remains pending on the running local database.
  Shared gRPC checks, Docker builds, live listener and local demo results are
  recorded separately in the log. Order/Credit demo integration has not been verified live. Agent checks
  do not establish human approval; latest documentation changes await review.
- **Provenance:** Shared messaging code belongs to @sunpterodactyl and the shared
  messaging contributors, imported from events/data-validation commit
  0b48f5f85be01d148176a6410c9ca22c2b8e672e. Its [provenance and original declarations](shared/messaging/README.md)
  are retained; Credit integration assistance does not claim that authorship.
  Official documentation consulted during implementation is cited in the usage
  log. Human authors remain responsible for licensing and assignment validation.
- **Submission:** Authors must review and validate assisted outputs, agree team AI
  norms, include the agent/skill instructions used, consolidate team disclosures,
  and link this README from the submission slides. Root AGENTS.md and
  credit-service/AGENTS.md are retained; no skills were invoked for these exchanges.
