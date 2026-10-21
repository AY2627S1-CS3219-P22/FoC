<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-22 (Asia/Singapore).
Scope: Archived the README review request and key findings.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 033.
-->

# Prompt archive — 033

## Exact user prompt

```text
can we check that our README covers the latest changes? especially for /health?
```

## Key responses

> I’ll compare the Credit README with the current code, especially `/health`, and update any gaps.

> `/health` is already documented correctly: public access, a PostgreSQL probe, 200/503 responses, and a curl command. I found a few gaps to fix: rebuilding an existing container to pick up the route, naming the new regression checks, and noting that event metadata is now optional. The root README also still labels Credit’s REST port as reserved.

## Changes and checks

Compared service README with REST routes/startup, migration 007, domain types,
event handler, example configuration, Dockerfile/Compose and existing regression
tests. Existing sections already describe sequenceId omission, exact history
checks and migration 007, full reservation reads, balance userId, replay behavior
and shared retries. Clarified default REST port, token-free health, rebuilding
existing containers, and the current absence of an application Compose healthcheck.
Documented the existing delivery payload and optional event metadata. Named
health/constraint/public-history regressions and attributed test figures to their
actual prior run. Corrected the root port table. No application/configuration
changes, container rebuild, new test execution, external source or delegation.
Verified scoped whitespace and documentation links. Human review pending.
