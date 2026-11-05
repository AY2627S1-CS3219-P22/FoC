# AI usage log: shared repository work

Repo-level work outside any one service (CI, Kubernetes, EKS). Service work is
logged in each service's own log.

## 001: CI review fixes for order and user workflows (PR #100)

- **Timestamp:** 2026-11-05 (Asia/Singapore).
- **Tool/model:** Claude Code (Anthropic), Claude Opus.
- **Mode/scenario:** Review of a teammate's CI pull request and fixes needed to
  deploy order-service and user-service on Kubernetes (EKS).
- **Prompts:** [prompts/001-pr100-ci-fixes.md](prompts/001-pr100-ci-fixes.md) (4 prompts).
- **Key responses:**
  1. "The user-service CI fails because the tests import `@prisma/client`
     before `prisma generate` has run, and neither workflow builds the
     `-migrate` images the Kubernetes initContainers need."
  2. "Replace the tests with `npm run build`, which already runs
     `prisma generate`. Keep the job, since `build-and-push-image` depends
     on it."
  3. "Added steps that build the Dockerfile's `migrate` stage and push it as
     `<service>-migrate`, with the same tags as the main image."
- **Key output:** user-service CI job renamed `test` → `build` and runs
  `npm run build`; both workflows also publish a `-migrate` image.
- **Affected locations:** `.github/workflows/user-service.yaml`,
  `.github/workflows/order-service.yaml`.
- **Human review/edits:** JadeCheah decided to drop the user-service tests
  from CI in favour of a build check and to publish migrate images; AI made
  the edits; JadeCheah reviewed the changes and approved.
- **External sources:** Failing GitHub Actions log for PR #100 (User Service
  CI); teammate's workflows in PR #100 (sunpterodactyl); Kubernetes manifests
  in PR #95, which name the `-migrate` images.
