<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
Scope: Archived the exact human-finalized service source layout and key relocation responses.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 024.
-->

# Prompt archive — 024

## Exact user prompt

```text
it shd be credit-service/src/grpc and credit-service/src/rest. so src contains domains, repos, services, grpc, rest, events, env.ts and index.ts
```

## Key assistant responses (verbatim)

I’ll move the code into your specified `credit-service/src/` layout, then update the workspace, imports, Docker configuration, tests, and disclosure records.

The workspace currently lives under `credit-service/grpc/`. I’ll move its package files, tests, and scripts to `credit-service/`, and place the source code in your seven folders under `src/`. I’ll retain the existing npm package name so workspace commands continue to work.

The new layout passes all 70 credit-service tests and eight shared gRPC tests. The Docker rebuild also passed, and the running container uses `/repo/credit-service` with both API listeners working. I’m finishing the documentation links and attribution checks.

## Key outputs

Moved the implementation to the supplied src layout. Existing data interfaces
are in domains/types.ts, SQL repository code in repos, credit rules/validation/
bookmarks in services, transport-specific authentication alongside grpc/rest
handlers, and user.created callback in events. env.ts/index.ts are at src root.
The service workspace manifest, tsconfig, test, scripts and example env moved to
the service root. Root npm workspace/link metadata, imports, migration paths,
Docker packaging, the shared transport test and current docs were updated.
The Supplier Dockerfile's credit manifest COPY path was adjusted. No SQL/schema,
RPC/REST response, or business-rule changes were made. Personal env files and
historical prompt archives were preserved.
