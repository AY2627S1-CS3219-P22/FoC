<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
Scope: Added disclosure for plaintext Credit transport update; author review pending.
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

Tool: ChatGPT (Codex), 2026-10-22. Modes: implementation/refactoring, tests and documentation.
Applied the team's explicit decision to use plaintext Order-to-Credit gRPC while
retaining service-token authentication on feature/order-create. Human review is
pending. Exact prompt, scope and verification: [Order usage log](order-service/usage-log.md).
This entry covers this change; other team AI use must also be disclosed.
