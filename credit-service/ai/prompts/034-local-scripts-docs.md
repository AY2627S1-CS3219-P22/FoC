<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-22 (Asia/Singapore).
Scope: Archived the folder-untracking request, migration-runner clarification and actual results.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 034.
-->

# Prompt archive — 034

## Exact user prompt

```text
let's untrack the whole folder scripts and docs inside credit-service as well
```

## Key response

> I’ll untrack `credit-service/scripts` and `credit-service/docs`, keep their local contents, and exclude them locally. I’ll also check whether any tracked files depend on them.

## Exact clarification and answer

> `scripts/apply-migration.cjs` is required by `npm run db:migrate`, Docker builds and two test files. Before untracking `scripts`, should I move that runner to `migrations/apply-migration.cjs` and update its references, or leave it local-only (which would break those commands in a fresh clone)?

```text
Move the migration runner and update references
```

Key follow-up response:

> I’ll move the migration runner to `migrations/apply-migration.cjs` and update the npm command, Dockerfile, tests and README. That will keep migrations working in a fresh clone while `scripts` and `docs` stay local-only.

## Outputs/checks

Moved the existing CLI without changing migration behavior, updated package.json,
removed both Docker COPY references to scripts, and updated the two affected tests
and service README/JSON attribution. Runtime Docker already copies migrations,
which now includes the CLI. Added folder-wide local .git/info/exclude rules;
no shared .gitignore rules. Removed only scripts/docs from the index. The seed
and reference documents remain locally; the runner moved as expressly requested.

An initial cached-removal request was automatically rejected after the clarification
arrived because relocation had not yet happened. That request made no changes.
Completed the approved relocation and dependent references first, then retried
the exact cached-removal operation successfully. No bypass or user escalation
was needed after fixing the ordering.

Affected migration/schema checks passed: 10 tests, no failures/skips, using isolated
local PostgreSQL schemas that were removed afterward. Docker build passed; runtime inspection confirmed the relocated runner/pg are
present and scripts absent. Git reports a staged runner rename, no indexed files
in scripts/docs, and folder-wide local exclusions. npm db:migrate resolves the
moved CLI correctly. No application-data
migrations, commits, pushes or running-service replacement. Human review pending.
