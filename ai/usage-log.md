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

## 002: UI CI workflow

- **Timestamp:** 2026-11-05 (Asia/Singapore).
- **Tool/model:** Claude Code (Anthropic), Claude Opus.
- **Mode/scenario:** New CI workflow so the UI image is published to GHCR for
  the Kubernetes (EKS) deployment.
- **Prompts:** [prompts/002-ui-ci.md](prompts/002-ui-ci.md) (2 prompts).
- **Key responses:**
  1. "Sure, here's a UI CI workflow following the `user-service.yaml`
     pattern: a build check on PRs, and on main a push of the `runtime`
     image to GHCR."
  2. "The other services are root npm workspaces covered by the root
     `package-lock.json`. The UI is not, so its build runs inside `ui/` with
     its own lockfile and Docker context."
- **Key output:** New `UI CI` workflow: build check on PRs; on main, builds
  the Dockerfile's `runtime` stage and pushes `foc/ui` with `sha-<sha>` and
  `latest` tags.
- **Affected locations:** `.github/workflows/ui.yaml`.
- **Human review/edits:** JadeCheah asked for UI CI following the
  user-service pattern and checked it against the other workflows; AI wrote
  the workflow; JadeCheah reviewed it and approved.
- **External sources:** `.github/workflows/user-service.yaml` (template);
  `ui/Dockerfile`, `ui/package.json`.

## 003: Debugging the user-service migration crash on EKS

- **Timestamp:** 2026-11-06 (Asia/Singapore).
- **Tool/model:** Claude Code (Anthropic), Claude Opus.
- **Mode/scenario:** Debugging a crash-looping migration initContainer during the
  first full-stack deploy on EKS.
- **Prompts:** [prompts/003-migrate-oomkilled.md](prompts/003-migrate-oomkilled.md) (3 prompts).
- **Key responses:**
  1. "The migrate initContainer is failing, so check its logs and whether the
     database is up."
  2. "The log stops right after Prisma connects with no error, which usually
     means the process was killed from outside. Check whether it was OOMKilled."
  3. "Confirmed OOMKilled: raise the migrate memory limit from 128Mi to 512Mi
     for user and order, which both run `prisma migrate deploy`."
- **Key output:** Migrate initContainer memory raised to 256Mi request / 512Mi
  limit for user-service and order-service.
- **Affected locations:** `k8s/user-service/user-service.yaml`,
  `k8s/order-service/order-service.yaml`.
- **Human review/edits:** JadeCheah ran the diagnosis commands on the cluster
  and applied the fix; AI identified the cause and made the edits; JadeCheah
  verified the migration completed and the service started.
- **External sources:** Pod status and logs from the EKS cluster (`kubectl`).

## 004: Kubernetes deployment README

- **Timestamp:** 2026-11-06 (Asia/Singapore).
- **Tool/model:** Claude Code (Anthropic), Claude Opus.
- **Mode/scenario:** Documentation of the EKS deployment.
- **Prompts:** [prompts/004-k8s-readme.md](prompts/004-k8s-readme.md) (1 prompt).
- **Key responses:**
  1. "Sure, here's a short README: an overview of how the deployment fits
     together, what each folder is, how images and deploys work, and a
     Continuous Deployment section with the OIDC setup and the steps for the
     deploy job."
- **Key output:** `k8s/README.md`.
- **Affected locations:** `k8s/README.md`.
- **Human review/edits:** JadeCheah set the scope and audience; AI wrote the
  README; JadeCheah reviewed it and approved.
- **External sources:** none.

## 005: gRPC load balancing across pods

- **Timestamp:** 2026-11-06 (Asia/Singapore).
- **Tool/model:** Claude Code (Anthropic), Claude Opus.
- **Mode/scenario:** Fixing gRPC calls that went to only one pod behind the
  Kubernetes Services, found while documenting the deployment.
- **Prompts:** [prompts/005-grpc-round-robin.md](prompts/005-grpc-round-robin.md) (1 prompt).
- **Key responses:**
  1. "Only the credit client balanced across pods; the others sent every call
     to one pod. Use round_robin for all clients, and have servers close
     connections periodically so clients find pods added by autoscaling."
- **Key output:** All gRPC clients balance across pods; servers pick up new pods.
- **Affected locations:** `shared/grpc/src/clients.ts`, `shared/grpc/src/server.ts`,
  `user-service/src/grpc/server.ts`.
- **Human review/edits:** JadeCheah flagged the issue and asked for the fix;
  AI made the edits; JadeCheah reviewed and approved.
- **External sources:** credit-service's existing gRPC server settings
  (`credit-service/src/grpc/server.ts`), reused for consistency.
# 006 Generic CI workflow
- **Timestamp:** 2026-11-09 (Asia/Singapore).
- **Tool/model:** Grok 4.7 (xAI), in Cursor.
- **Mode/scenario:** Add continuous deployment to the credit-service workflow
  while keeping pull-request checks. The supplied sample was an Elastic
  Beanstalk zip deploy of an Address Book app.
- **Prompts:** [prompts/003-cd.md](prompts/003-cd.md).
- **Key responses:** Pull requests keep test, lint, and the image build. A
  deploy job runs only on push to `main`, after those jobs pass, and applies
  the credit-service Kubernetes manifests to EKS with this commit's GHCR image.
  The Beanstalk zip was not used: credit-service is a compiled workspace image
  with an init migration container, and the repo already deploys it to EKS.
- **Key output:** `deploy` job in `.github/workflows/credit-service.yaml`.
  Follow-up: the image swap is a `sed` in that job. `GITHUB_SHA` matches the
  `sha-<commit>` tag published by `build-and-push-image`. The substitution
  rewrites both `image:` lines in `k8s/credit-service/credit-service.yaml`
  before one `kubectl apply`. A `:latest` substitution does not match these
  manifests, which pin `:sha-<commit>`.
  Follow-up: the human copied the credit deploy job into the order, user,
  supplier and UI workflows. Then a new prompt was made to change the deployed
  credit-service to use each services own mainfest. AI pointed each copy at its own manifests and
deployment, matched the `-migrate` images for order and user, set
  `needs: build-and-push-image`, and added `k8s/<service>/**` to each
  workflow's paths.
- **Affected locations:** `.github/workflows/credit-service.yaml`,
  `.github/workflows/order-service.yaml`, `.github/workflows/user-service.yaml`,
  `.github/workflows/supplier-service.yaml`, `.github/workflows/ui.yaml`,
  `ai/usage-log.md`, `ai/prompts/003-cd.md`.
- **Human review/edits:** Human review done actually, I was q specific.
- **External sources:** Existing credit-service workflow and
  `k8s/credit-service/credit-service.yaml`. User-supplied Beanstalk sample
  (AddressBookApp, `einaregilsson/beanstalk-deploy@v22`, region
  `ap-southeast-1`).
