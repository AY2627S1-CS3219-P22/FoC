<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-21–2026-10-22.
Scope: Maintained the final AI Use Summary section. Team review pending.
See order-service/usage-log.md. -->

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

Tool: ChatGPT (Codex), 2026-10-21–2026-10-22. Modes: implementation, configuration and documentation generation.
Used to install Express 5.2.1 and Prisma 6.19.3, transcribe and migrate the author-provided Order schema,
and configure a local Order PostgreSQL container after the author selected
PostgreSQL and Docker, following the existing User Service setup. Also generated the team-approved Express/gRPC startup, database-backed health,
environment validation and application Docker setup.
Also implemented author-specified creation, credit-edit recovery, cancellation
and expiry, with tests and a durable OrderEditOperation migration. The author
supplied the schema, contracts, retry schedule and final first-lock-wins rule.
Human decisions and superseded requirements are recorded in the service usage log;
no decision rationales were drafted.

Team review and validation remain pending. Prompts, key responses and verification
results are recorded in [order-service/usage-log.md](order-service/usage-log.md). Add a link to this README
to the submission slide deck. This entry covers this session only; the team must
record other AI use and include applicable AGENTS.md/SKILLS.md files before submission.
