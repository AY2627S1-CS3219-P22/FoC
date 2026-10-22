<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-21 (Asia/Singapore).
Scope: Archived the exact directory-layout question and factual explanation; target structure remains a human decision.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 023.
-->

# Prompt archive — 023

## Exact user prompt

```text
i think the current directory structure is confusing, grpc and rest should be separate folders at the same level under credit-service right?
```

## Key response

Yes, they can be sibling folders. Currently, `grpc/` contains the entire application—including REST handlers, business logic, repositories, and startup—so its name is misleading.

Before I reorganize it, where should the shared business logic, repositories, and startup live? Your assignment rules reserve that structural decision for you.
