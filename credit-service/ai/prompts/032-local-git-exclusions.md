<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-22 (Asia/Singapore).
Scope: Archived the exact local-exclusion request and key response.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 032.
-->

# Prompt archive — 032

## Exact user prompt

```text
we need to untrack these files and folders but i dont want to mention it in gitignore 

postman
.postman

/credit-service/docs/user-decisions.md
/credit-service/docs/reference/functional-requirements.md
/credit-service/docs/reference/nonfunctional-requirements.md
```

## Key response

> I’ll remove those entries from `.gitignore` and untrack any listed files still in Git, keeping the local copies. I’ll put the exclusions in `.git/info/exclude` so they stay local.

The requested paths were already absent from Git's index. The three document
removals from exchange 031 remain staged; neither demo directory was tracked.
Removed the three remaining document patterns from .gitignore, and added root-scoped
patterns for all five requested locations to local .git/info/exclude. Also retained
the earlier user requirement that the temporary seed script stay untracked by
excluding that exact script locally. No local files were deleted. No commits,
pushes, application changes or test execution were required.

Verification: git ls-files reports no indexed files at the requested locations;
git check-ignore -v points at .git/info/exclude; local path existence checked;
shared .gitignore contains none of the requested paths. Human review pending.
