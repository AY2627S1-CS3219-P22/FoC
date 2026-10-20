<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-19–2026-10-20 (Asia/Singapore).
Scope: Maintained this credit-service log for supplied references, Docker/PostgreSQL setup, implementation/tests, the finalized nine-RPC contract, and human-confirmed SHA-256/initialization replay.
Author review: Pending human review; no human validation is claimed.
Prompts and key responses: Entries 001–012 below and the linked prompt archives.
-->

# AI usage log

Maintain this credit-service log throughout implementation. Archive substantive prompts
verbatim, including follow-ups and corrections, and record key responses and
actual outcomes. Do not infer human approval from agent-run checks. This log
starts with the exchange below; it does not establish earlier team AI history.

## 001 — Disclosure setup

- **Timestamp:** 2026-10-19 23:48 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Mode/scenario:** Documentation generation to record AI assistance before
  credit-service implementation.
- **Exact prompt:** [Original user prompt and supplied repository instruction](prompts/001-disclosure-setup.md).
- **Key response (verbatim):** “I’ll inspect the branch and set up the usage log
  and disclosures. Before writing credit-service code, I’ll need your finalized
  requirements and architecture. I’ll record prompts and key responses, and leave
  author review marked as pending until you confirm it.”
- **Key output:** Added repository instructions for allowed assistance and ongoing
  attribution, created this log and prompt archive, and appended the final README
  AI Use Summary. No service code, schema, interface, architecture, or decision
  rationale was generated.
- **Affected locations:** `AGENTS.md` (instructions), `README.md` (header and final
  section), `ai/usage-log.md`, `ai/prompts/001-disclosure-setup.md`.
- **Agent verification:** Inspected branch/status and existing instruction/README
  files; checked the documentation diff, attribution headers, and relative links.
  No application tests are applicable to this documentation-only change.
- **Human review/edits:** Pending. No author review, correctness validation, team
  agreement, or acceptance is asserted.
- **External sources/licensing:** No external sources or third-party code used.
- **Instruction files used:** User-supplied AGENTS.md instructions; repository root
  `AGENTS.md` and `credit-service/AGENTS.md` (both empty before setup). No skills
  were invoked.
- **Remaining human input:** Finalized credit-service requirements and architecture
  before implementation; confirmation of human review when completed.

## 002 — Move disclosure records under credit-service

- **Timestamp:** 2026-10-19 23:49 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Mode/scenario:** Documentation refactoring to scope the AI records to credit-service.
- **Exact prompt:**

  ```text
  this specific AI folder should be under credit-service, not in the repository log
  ```

- **Key response (verbatim):** “I’ll move the usage log and prompt archive into
  `credit-service/ai/`, update the links, and record this correction there.”
- **Key output:** Moved the root `ai/` folder to `credit-service/ai/`. Updated
  repository instructions and the root README to link to the credit-service log.
  The root README retains the consolidated summary required by the original
  guidelines. The archived original prompt remains unchanged.
- **Affected locations:** `AGENTS.md`, `README.md`,
  `credit-service/ai/usage-log.md`,
  `credit-service/ai/prompts/001-disclosure-setup.md`.
- **Agent verification:** Checked attribution headers, relative documentation
  links, final README section, and removal of the root `ai/` directory.
  No application tests are applicable to this documentation-only change.
- **Human review/edits:** User specified the folder location. Human review of the
  resulting files remains pending.
- **External sources/licensing:** No external sources or third-party code used.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Finalized credit-service requirements and architecture
  before implementation; confirmation of human review when completed.

## 003 — Save human requirements/design and set up local containers

- **Timestamp:** 2026-10-20 00:00 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Documentation formatting/archival and Docker configuration
  boilerplate for the existing gRPC scaffold and human-selected PostgreSQL 17.
- **Exact prompt and attachments:** [Request, original class list, diagram
  transcription, attachment links, and clarifications](prompts/003-requirements-and-setup.md).
  Both requirements attachments are archived verbatim inside documentation
  wrappers; their priorities and planned sprints are human-supplied.
- **Key response (verbatim):** “I’ll save your requirements and design as reference
  material, then inspect the existing Docker and credit-service setup. I’ll start
  with the parts your decisions fully specify and flag any schema details that
  still need your input.”
- **Key output:** Added the supplied references under `credit-service/docs/` and
  the exact request under `credit-service/ai/prompts/`. Added Docker configuration
  for the existing credit gRPC workspace, PostgreSQL 17, and local example
  environment values. The existing gRPC interfaces and handlers are unchanged.
  Schema/domain/repository implementation is pending human input on table-list
  discrepancies, types, constraints, values, and persistence/migration tooling.
  No requirements priorities, architecture/design decisions, or decision
  rationales were generated.
- **Affected locations:** `README.md`; `credit-service/README.md`,
  `credit-service/Dockerfile`, `credit-service/Dockerfile.dockerignore`,
  `credit-service/compose.yaml`, `credit-service/.env.docker.example`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/docs/reference/functional-requirements.md`,
  `credit-service/docs/reference/nonfunctional-requirements.md`,
  `credit-service/ai/prompts/003-requirements-and-setup.md`, and this log.
- **Agent verification:** Shared gRPC and credit gRPC TypeScript builds passed;
  Compose configuration validation, Docker build, and container startup passed.
  PostgreSQL reports version 17.11 with database/user `credit_service` and zero
  public application tables. The packaged gRPC client resolves its contract and
  `GetBalance` returns the existing `UNIMPLEMENTED` status. Documentation links,
  attribution headers, verbatim attachment copies, and final README section were
  checked. An initial documentation-check script incorrectly expected an exact
  bare attribution line in Dockerfiles; the check was corrected to recognize
  comment prefixes. Docker daemon access required sandbox escalation and was
  granted. Human environment files were not read or changed. Containers remain
  running at host ports 5433 (PostgreSQL) and 50054 (gRPC). Compose reported
  pre-existing stopped project containers; those were left untouched.
- **Human review/edits:** The user supplied PostgreSQL 17 and the reference design.
  Review of generated Docker configuration and copied documentation remains
  pending. No human validation or team approval is asserted.
- **Sources/licensing:** Consulted the [official PostgreSQL image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md)
  for PostgreSQL 17 environment/volume configuration and
  [Docker Compose startup documentation](https://docs.docker.com/compose/how-tos/startup-order/)
  for health-check ordering. Configuration boilerplate was generated; no
  third-party implementation code was copied. No independent license audit is
  claimed.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Finalized table list and column schema; persistence
  and migration tooling; review confirmation when completed. Questions are
  recorded in the linked exchange archive.

## 004 — Record human schema and idempotency decisions

- **Timestamp:** 2026-10-20 00:20 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Mode/scenario:** Documentation formatting and clarification of human-supplied
  schema details before implementation.
- **Exact prompt and key responses:** [Verbatim human answers and assistant
  clarification questions](prompts/004-schema-decisions.md).
- **Key output:** Recorded the final five-table list, the human's explicit
  deferral of `archived_balances`, supplied column specifications, idempotency
  transaction/retry behavior, and `pg` with SQL migrations. Requested human
  resolution of conflicting user ID types, missing FK/column details, and
  attribution for JSON manifests. No schema/design decisions, rationales,
  implementation code, or database changes were generated in this exchange.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/ai/prompts/004-schema-decisions.md`, and this log.
- **Agent verification:** Checked the documentation diff, local links,
  attribution headers, and final README disclosure section. No application tests
  were run for this documentation-only update.
- **Human review/edits:** These decisions were explicitly supplied by the human;
  review of the formatted record remains pending.
- **External sources/licensing:** No external sources or third-party code used.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Answers to the three clarification questions in the
  linked archive before the affected implementation proceeds.

## 005 — Confirm column rules and add pg migration tooling

- **Timestamp:** 2026-10-20 00:40 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Documentation formatting, implementation/boilerplate, and
  integration-test generation for the human-selected `pg` and SQL migrations.
- **Exact prompt and key responses:** [Human answers, JSON attribution approval,
  initial response, and remaining clarification questions](prompts/005-column-rules-and-pg.md).
- **Key output:** Recorded text account IDs, account/reservation FKs, logical
  order references, nullability, integer history balance fields, timezone-aware
  timestamps, and permitted status/operation values. Preserved the human's
  idempotency flow. Deferred archival and archive/restore operation types as
  requested. Added `pg` 8.23.1, a CLI for applying one selected SQL file in a
  transaction, integration checks, and container connection configuration. No
  application DDL or business operations were generated or applied while the
  history `amount`, naming, and default questions remain pending.
- **Affected locations:** `AGENTS.md`, `README.md`, `package-lock.json`,
  `credit-service/README.md`, `credit-service/docs/user-decisions.md`,
  `credit-service/Dockerfile`, `credit-service/compose.yaml`,
  `credit-service/grpc/package.json`,
  `credit-service/grpc/scripts/apply-migration.cjs`,
  `credit-service/grpc/test/migration.test.cjs`,
  `credit-service/ai/prompts/005-column-rules-and-pg.md`, and this log.
- **JSON attribution exception:** Human explicitly approved attribution in the
  service README and this log for `credit-service/grpc/package.json` (dependency,
  migration command, and test command) and root `package-lock.json` (npm-generated
  dependency records, including incidental normalization of existing package
  flags). Both are AI-influenced; human review remains pending.
- **Agent verification:** All three migration-tool tests passed against
  PostgreSQL 17, with no skips. The integration check verified committed data,
  visible failure on reapplication without changing committed data, and rollback
  of both table creation and an insert on SQL failure. Its generated test schema
  and temporary SQL files were removed. Shared/credit gRPC builds, Compose config
  validation, and Docker rebuild/start passed. The rebuilt runtime resolved `pg`,
  connected to PostgreSQL 17, included the migration CLI, and returned the
  expected gRPC `UNIMPLEMENTED` response. Database inspection confirmed no public
  application tables and no leftover test schemas. Attribution/link checks and
  the final README disclosure check passed; `git diff --check` passed.
- **Tool access:** The first sandboxed npm install stalled and was interrupted;
  the authorized install with network access succeeded. Docker and local
  database access used granted sandbox escalation. No automatic approval review
  rejection occurred.
- **Human review/edits:** Human supplied the recorded schema decisions and JSON
  exception. Generated implementation, tests, and formatted records await human
  review; passing agent tests do not assert human validation.
- **Sources/licensing:** Consulted [node-postgres connections](https://node-postgres.com/features/connecting),
  [node-postgres transactions](https://node-postgres.com/features/transactions),
  and [PostgreSQL 17 constraints](https://www.postgresql.org/docs/17/ddl-constraints.html).
  Implementation was generated using those API descriptions; no third-party
  implementation code was pasted. npm lockfile metadata identifies `pg` as MIT
  and its added transitive packages as MIT/ISC. No independent licensing audit
  or legal conclusion is claimed.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Whether history retains `amount` alongside the new
  balance fields, whether the latest shorthand renames columns, and required
  value defaults. No component boundaries, public interfaces, schemas, or decision
  rationales were selected by AI.

## 006 — Implement the human-specified initial SQL schema

- **Timestamp:** 2026-10-20 00:48 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation from human-supplied schema, integration-test
  generation, bounded interpretation of supplied shorthand, and documentation.
- **Exact prompt and key response:** [Human history-field, spelling, and default
  answers, implementation response, and shorthand mapping](prompts/006-history-deltas-and-defaults.md).
- **Key output:** Generated `001_initial.sql` for the four currently in-scope
  tables. Used `requestor_id` and `operation_type`; replaced the earlier history
  amount fields with signed integer `total_amount_change` and
  `total_reserved_change`. Added the human's supplied account, timestamp, UUID,
  and status defaults and previously confirmed nullability/FKs/checks. Added the
  migration to the runtime image and PostgreSQL schema integration tests. Archival
  remains deferred; no controller/service/repository business operations were
  implemented.
- **Shorthand interpretation:** Applied the supplied `reserved_credits = 0`
  default to the existing `credit_accounts` column, not a new reservation column.
  Mapped the repeated timestamp defaults to existing account/reservation fields.
  Retained reservation `credit_amount` and application-supplied `requestor_id`;
  no default for `version` was specified, so application supplies it. These
  interpretations were stated to the user and preserved with the exact prompt.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/Dockerfile`, `credit-service/migrations/001_initial.sql`,
  `credit-service/grpc/test/schema.test.cjs`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/ai/prompts/006-history-deltas-and-defaults.md`, and this log.
- **Agent verification:** All nine migration/schema tests passed against
  PostgreSQL 17 with no skips. Checks covered four-table/column shape, nullability,
  defaults, nonnegative account invariants, FKs, allowed status/type values, signed
  history deltas, nullable initial-history references, JSONB, and composite
  idempotency key scope. Temporary schemas were removed. Docker rebuild/start
  passed, including shared/credit gRPC compilation. Verified the local public
  schema was empty, then applied `001_initial.sql` through the packaged migration
  CLI. The local database now contains exactly the four agreed tables, with no
  rows or leftover test schemas. Inspected the applied defaults, signed integer
  field types, and required application-supplied version. Attribution headers,
  local links, final README section, and `git diff --check` passed.
- **Human review/edits:** Schema decisions came from the human across exchanges
  004–006. Generated SQL, tests, and shorthand formatting await human review;
  passing agent checks do not assert human validation.
- **Sources/licensing:** Consulted PostgreSQL 17 documentation for
  [signed integer types](https://www.postgresql.org/docs/17/datatype-numeric.html),
  [UUID generation](https://www.postgresql.org/docs/17/functions-uuid.html), and
  [column defaults](https://www.postgresql.org/docs/17/ddl-default.html).
  No third-party implementation code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Review of generated artifacts. Business-operation
  implementation and deferred archival are outside this schema step.

## 007 — Align the shared credit contract and reservation schema

- **Timestamp:** 2026-10-20 08:49 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation from human-specified schema changes,
  generated-type regeneration, test generation, debugging, and documentation.
- **Exact prompt and key responses:** [Original request and clarification
  questions](prompts/007-align-credit-contract.md). The subsequent human answers
  are recorded in entry 008.
- **Key output:** Generated and applied migration 002 to rename reservation
  `requestor_id` to `requester_id` and convert stored `transferred` to `SETTLED`.
  Kept migration 001 unchanged after its earlier application. Aligned existing
  four-RPC message fields with the previously supplied schema: `credit_amount`,
  account totals/timestamps, reservation ID/version/timestamps, nullable courier
  presence, and caller-generated mutation idempotency keys. Changed idempotency
  comments from order-only to the human's operation/key scope. Regenerated six
  TypeScript files, retained their generated source comments, and added AI
  attributions. Retained existing protobuf field numbers and enum numbers.
  No additional RPC methods or credit business operations were implemented.
- **Affected locations:** `shared/grpc/proto/credit.proto`,
  `shared/grpc/src/generated/credit.ts`,
  `shared/grpc/src/generated/credit/{Balance,ReleaseCreditsRequest,Reservation,ReserveCreditsRequest,SettleCreditsRequest}.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`, `shared/grpc/README.md`,
  `credit-service/migrations/002_align_credit_contract.sql`,
  `credit-service/grpc/test/schema.test.cjs`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`, `README.md`,
  `credit-service/ai/prompts/007-align-credit-contract.md`, and this log.
- **Agent verification:** Proto generation and the full workspace build passed.
  Ten database tests passed, including an existing migration-001 schema upgraded
  with renamed requester fields and converted terminal statuses without losing
  IDs, amounts, or version values. Seven shared transport/contract tests passed,
  including credit amount/key transport, totals, timestamps, optional courier
  presence, and settled status. Docker rebuild/start passed; applied migration
  002 to the local database and inspected the requester column and check.
- **Debugging outcome:** Initial `npm test` had six passes and one failure:
  a pre-existing test expected the now-implemented User Service public-profile
  RPC to return `UNIMPLEMENTED` and attempted to access unavailable User Service
  PostgreSQL. Corrected that test to check missing-ID validation without a
  database call. The suite then passed seven of seven; no User Service code was
  changed.
- **Human review/edits:** Schema rename/terminal-status changes and contract
  alignment were requested by the human. Generated changes await human review.
  The broader casing/scope answers arrived during this work and are captured in
  entry 008; no response was assumed from the preselected options. Preserved the
  human's existing `Human Reviewed.` marker in `credit-service/README.md` for its
  earlier content and separately marked these new additions as pending review.
- **Sources/licensing:** Consulted the [Protobuf message-update documentation](https://protobuf.dev/programming-guides/proto3/#updating)
  and [PostgreSQL 17 ALTER TABLE reference](https://www.postgresql.org/docs/17/sql-altertable.html).
  No third-party implementation code was pasted. Generated types came from the
  existing repository generator and the assisted proto change.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Review and the wider RPC specification described in
  entry 008. Status casing was resolved explicitly by the human in entry 008.

## 008 — Confirm uppercase statuses and defer wider RPC additions

- **Timestamp:** 2026-10-20 08:54 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation/test updates from a human-confirmed schema
  refinement and documentation of future RPC scope.
- **Exact prompt and key response:** [Verbatim uppercase-status and wider-RPC
  answers](prompts/008-status-casing-and-rpc-scope.md).
- **Key output:** Added migration 003 to convert existing reservation status
  values to uppercase, set the default to `RESERVED`, and constrain values to
  `RESERVED`, `RELEASED`, `SETTLED`, matching the existing proto enum labels.
  Updated schema tests/docs to the confirmed final names and values. Additional
  RPCs await the wider human-supplied specification; none were invented.
- **Affected locations:** `credit-service/migrations/003_uppercase_reservation_status.sql`,
  `credit-service/grpc/test/schema.test.cjs`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`, `shared/grpc/README.md`, `README.md`,
  `credit-service/ai/prompts/008-status-casing-and-rpc-scope.md`, and this log.
- **Agent verification:** All ten database tests passed again with all
  three migrations applied in temporary schemas. Verified upgrade of existing
  reserved/released/transferred rows, rejection of the old lowercase values,
  uppercase default, and preservation of requester relationships. Docker rebuild
  and application of migration 003 passed. Compared the running database's
  status constraint directly with the packaged proto enum: values matched
  exactly. Verified the live `requester_id` column, uppercase default, updated
  reserve request shape, and absence of leftover test schemas. Attribution,
  local-link, final README section, and `git diff --check` checks passed.
- **Human review/edits:** Human explicitly chose all three uppercase values and
  stated that a wider RPC specification will follow. Generated artifacts await
  human review.
- **Sources/licensing:** PostgreSQL ALTER TABLE documentation already consulted
  in entry 007; no third-party implementation code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Wider RPC request/response specification and review
  of the generated artifacts. No new architecture, interfaces, or rationales were
  proposed for those future endpoints.

## 009 — Record the human-decided nine-RPC list and prepare request messages

- **Timestamp:** 2026-10-20 08:58 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Bounded requirements/contract interpretation and formatting,
  implementation from human-finalized request fields, generated-type regeneration,
  and documentation.
- **Exact prompt and key response:** [Verbatim RPC list, initial response, and
  clarification questions](prompts/009-finalized-rpc-list.md).
- **Key output:** Recorded the human's nine-method list in its supplied order.
  Changed the external reserve/reservation amount field from interim
  `credit_amount` to the now-specified `amount`, retaining field number 3; SQL
  remains `credit_amount`. Prepared request messages for `InitCredits`, user/order
  history with optional pagination fields, `UpdateReservation` with
  `expected_version`, and `GetReservation`. Regenerated eleven affected/new credit
  TypeScript files and restored their attribution headers. Existing four service
  declarations, responses, and idempotency keys remain pending the human's
  remaining response/key definitions. No new response shapes, pagination
  policies, service boundaries, or business logic were chosen or implemented.
- **Affected locations:** `shared/grpc/proto/credit.proto`,
  `shared/grpc/src/generated/credit.ts`,
  `shared/grpc/src/generated/credit/{Balance,ReleaseCreditsRequest,Reservation,ReserveCreditsRequest,SettleCreditsRequest,InitCreditsRequest,GetUserCreditHistoryRequest,GetOrderCreditHistoryRequest,UpdateReservationRequest,GetReservationRequest}.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`, `shared/grpc/README.md`,
  `credit-service/README.md`, `credit-service/docs/user-decisions.md`,
  `README.md`, `credit-service/ai/prompts/009-finalized-rpc-list.md`, and this log.
- **Agent verification:** Proto generation, the full workspace TypeScript build,
  and all seven shared transport/contract tests passed. Docker rebuild/start
  passed; verified the packaged five new request definitions, `amount` wire
  serialization, and the reachable existing scaffold endpoint. Attribution,
  local-link, final README disclosure, and `git diff --check` checks passed.
  No SQL, migration,
  dependency, or database state changes were required; database tests were not
  repeated for these contract-only changes.
- **Human review/edits:** RPC names, core request fields, and described behavior
  were supplied by the human. Responses not fully specified by the human have
  not been invented. Existing reviewed README content was preserved; new edits
  remain pending review.
- **Sources/licensing:** Used the existing repository generator and loader;
  Protobuf documentation previously recorded in entry 007 supplies the field
  number/optional-field conventions. No third-party implementation code was
  copied or new external source consulted.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Initialization/mutation/reservation/history response
  definitions, history list/token names and entry fields, caller idempotency-key
  placement in the latest signatures, and whether GetBalance retains its prior
  user/timestamp response fields.

## 010 — Implement finalized response shapes and internal-key request signatures

- **Timestamp:** 2026-10-20 09:16 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation from human-finalized interfaces, generated
  scaffolding/types, transport-test updates, and documentation formatting.
- **Exact prompt and key response:** [Verbatim response/internal-key answers,
  initial response, and targeted follow-up questions](prompts/010-response-shapes-and-internal-keys.md).
- **Key output:** Removed caller idempotency-key fields. Trimmed balance to its
  three balances and mutation responses to the seven human-specified reservation
  fields, reserving removed protobuf numbers/names. Added read-only
  `GetReservationResponse` with exactly status/amount/version. Added
  `UpdateReservation` and `GetReservation` RPC declarations, existing-style Promise
  wrappers, and `UNIMPLEMENTED` handler entries. Added all eight history-table
  fields to `CreditHistoryEntry`, preserving nullable IDs and signed deltas.
  Recorded once-only first-registration initialization with 10 credits, without
  implementing business logic or choosing its unspecified response payload.
  Initialization/history page RPC declarations remain pending their final
  payload definitions; internal retry recognition remains a human decision.
- **Affected locations:** `shared/grpc/proto/credit.proto`,
  `shared/grpc/src/clients.ts`, `shared/grpc/src/generated/credit.ts`,
  `shared/grpc/src/generated/credit/{Balance,CreditService,Reservation,ReserveCreditsRequest,ReleaseCreditsRequest,SettleCreditsRequest,InitCreditsRequest,GetUserCreditHistoryRequest,GetOrderCreditHistoryRequest,UpdateReservationRequest,GetReservationRequest,GetReservationResponse,CreditHistoryEntry}.ts`,
  `credit-service/grpc/src/grpc/server.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`, `shared/grpc/README.md`,
  `credit-service/README.md`, `credit-service/docs/user-decisions.md`,
  `README.md`, `credit-service/ai/prompts/010-response-shapes-and-internal-keys.md`,
  and this log.
- **Agent verification:** Proto regeneration, the full workspace build, and all
  seven shared transport/contract tests passed. Tests exercised exact balance
  fields, exact mutation fields, nullable courier presence, absence of caller
  keys, amount/version transport, and exact read-only reservation response;
  newly declared scaffold endpoints return `UNIMPLEMENTED`. Docker rebuild/start
  passed. Runtime checks confirmed exact balance/lookup response fields, removed
  caller keys, and both new unimplemented endpoints. Attribution headers/log
  pointers, local links, final README section, and `git diff --check` passed. No database
  schema, dependency, or data changes were required, so database tests were not
  repeated.
- **Attribution maintenance:** Restored headers on three regenerated request
  files whose bodies reverted to their original baseline when caller keys were
  removed, as well as other affected generated files. Preserved generated source
  comments and the human's existing README review marker; current edits remain
  pending human review.
- **Human review/edits:** The human specified exact responses, all-table history
  entries, once-only registration behavior, and internal key generation,
  superseding the earlier caller-key choice. No unprovided InitCredits response,
  page wrapper, or internal retry-identification design was selected by AI.
- **Sources/licensing:** Used existing repository client/scaffold/generator
  conventions and previously consulted Protobuf documentation (entry 007).
  No third-party implementation code was pasted or new external source consulted.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Success payload for InitCredits; history-page list
  and next-token field names; logical-retry recognition for internal keys before
  business implementation; review of generated changes.

## 011 — Add shared history paging and record deterministic-key/initialization rules

- **Timestamp:** 2026-10-20 09:44 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation/type regeneration from human-finalized
  history interfaces, transport-test generation, documentation, and explanation
  of the human's original-response replay rule.
- **Exact prompt and key response:** [Verbatim initialization/history/key answers,
  initial response, targeted questions, and replay explanation](prompts/011-init-outcomes-and-deterministic-keys.md).
- **Key output:** Added `CreditHistoryPage` with the human's `entries` and
  `next_page_token`, reused by both history RPCs. Added their declarations,
  existing-style Promise wrappers, and `UNIMPLEMENTED` handler entries. Preserved
  all eight entry fields, signed deltas, nullable references, and optional request
  pagination. Regenerated/attributed fifteen credit TypeScript files. Recorded
  the human's deterministic request-key recomputation, operation/key lock,
  lookup/hash comparison, original-result replay, and atomic-save flow without
  choosing or implementing a hash/lock mechanism. Recorded first-registration
  allocation failure/delay handling and no second initial grant on duplicates or
  future restoration. Initialization result fields/values, gRPC failure codes,
  duplicate-result semantics, and `SHA-26` name remain pending clarification.
- **Affected locations:** `shared/grpc/proto/credit.proto`,
  `shared/grpc/src/clients.ts`, `shared/grpc/src/generated/credit.ts`,
  `shared/grpc/src/generated/credit/{Balance,CreditService,Reservation,ReserveCreditsRequest,ReleaseCreditsRequest,SettleCreditsRequest,InitCreditsRequest,GetUserCreditHistoryRequest,GetOrderCreditHistoryRequest,UpdateReservationRequest,GetReservationRequest,GetReservationResponse,CreditHistoryEntry,CreditHistoryPage}.ts`,
  `credit-service/grpc/src/grpc/server.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`, `shared/grpc/README.md`,
  `credit-service/README.md`, `credit-service/docs/user-decisions.md`,
  `README.md`, `credit-service/ai/prompts/011-init-outcomes-and-deterministic-keys.md`,
  and this log.
- **Agent verification:** Proto generation, full workspace build, and all eight
  shared transport/contract tests passed. History tests verified shared page/entry
  shapes, list order preservation over the wire, page-size/token presence,
  metadata forwarding, negative deltas, timestamps, and nullable IDs. Stub tests
  verified all eight declared credit endpoints remain unimplemented. Docker
  rebuild/start passed. Runtime inspection confirmed both history stubs, the
  common page message, signed deltas, and nullable IDs. Hash-name inspection
  reported `sha256` available and `sha26` unavailable; no algorithm was selected
  or implemented. Attribution/log-pointer, local-link, final README section, and
  `git diff --check` checks passed. No database schema or state changes were required; database tests
  were not repeated for this contract-only change.
- **Human review/edits:** The human selected the shared page/entry and exact
  field names, deterministic-key/locking flow, original-response replay, and
  initialization behavior. Generated code/docs await human review. No hash,
  concrete lock strategy, initialization result schema, retry strategy, or
  response-code policy was selected by AI.
- **Sources/licensing:** Consulted [Stripe's idempotency documentation](https://docs.stripe.com/api/idempotent_requests)
  specifically for API v1 original-response replay, and
  [Node.js hash API documentation](https://nodejs.org/api/crypto.html#cryptogethashes)
  for supported-hash inspection. The replay explanation describes the human's
  rule; no Stripe error caching, retention, key generation, or other policies were
  adopted. No third-party implementation code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Confirm the hash algorithm; define initialization
  payload fields/types/values and any gRPC failure codes; specify duplicate
  initialization's result versus the general original-response replay rule;
  review the generated artifacts. Concrete pagination/locking details remain
  for the subsequent business-implementation step.

## 012 — Complete InitCredits contract and record SHA-256/saved-success replay

- **Timestamp:** 2026-10-20 09:52 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation/type regeneration from human-finalized
  initialization interface, client/scaffold boilerplate, transport-test updates,
  and documentation formatting.
- **Exact prompt and key response:** [Verbatim SHA-256 confirmation, duplicate
  initialization outcome, payload, and implementation response](prompts/012-init-payload-and-sha256.md).
- **Key output:** Added `InitCredits` with `InitCreditsResponse` containing exactly
  `user_id`, `total_credits`, `reserved_credits`, and `available_credits`. Added its
  existing-style Promise client wrapper and unimplemented handler, completing
  all nine human-decided RPC declarations/wrappers/stubs. Regenerated and
  attributed sixteen credit TypeScript files. Recorded SHA-256 and the explicit
  rule that duplicate initialization returns the original saved success without
  granting again. No separate status flags, application error-code mapping,
  hashing/locking code, or allocation logic was introduced.
- **Affected locations:** `shared/grpc/proto/credit.proto`,
  `shared/grpc/src/clients.ts`, `shared/grpc/src/generated/credit.ts`,
  `shared/grpc/src/generated/credit/{Balance,CreditService,Reservation,ReserveCreditsRequest,ReleaseCreditsRequest,SettleCreditsRequest,InitCreditsRequest,InitCreditsResponse,GetUserCreditHistoryRequest,GetOrderCreditHistoryRequest,UpdateReservationRequest,GetReservationRequest,GetReservationResponse,CreditHistoryEntry,CreditHistoryPage}.ts`,
  `credit-service/grpc/src/grpc/server.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`, `shared/grpc/README.md`,
  `credit-service/README.md`, `credit-service/docs/user-decisions.md`,
  `README.md`, `credit-service/ai/prompts/012-init-payload-and-sha256.md`,
  and this log.
- **Agent verification:** Proto generation, full workspace build, and all eight
  shared transport/contract tests passed, including exact initialization payload,
  metadata forwarding, no caller key, and reachability of all nine unimplemented
  credit endpoints. Docker rebuild/start passed. Packaged runtime checks verified
  all nine RPC declarations, the exact initialization response, exclusion of caller
  keys, and the reachable unimplemented initialization handler. File attribution,
  log-pointer, local-link, final README section, and `git diff --check` checks
  passed. These checks verify contract transport/scaffolding, not
  initial allocation or duplicate replay business behavior. No database schema,
  dependency, or data changes were required; database tests were not repeated.
- **Human review/edits:** The human selected SHA-256, the exact four-field
  initialization payload, and original-success replay on duplicate initialization,
  resolving the earlier questions. Code/docs remain pending human review;
  existing human-reviewed README content was preserved.
- **Sources/licensing:** Existing repository generator/client/scaffold conventions
  and previously recorded Protobuf references were used. No new external source
  was consulted and no third-party implementation code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Review of generated artifacts. Concrete pagination,
  locking, and operation/error details remain for the later business-implementation
  step; no further success-payload clarification is required for this contract.

For each later entry, record the same fields and update the README and affected
file headers. Record actual human edits, acceptances, or rejections only when the
human provides them.
