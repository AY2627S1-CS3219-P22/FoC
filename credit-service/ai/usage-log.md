<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), dates: 2026-10-19–2026-10-21 (Asia/Singapore).
Scope: Maintained this credit-service log for supplied references, Docker/PostgreSQL setup, implementation/tests, credit contracts including event-driven initialization replacement, human-confirmed business/transaction rules, and bounded clarification.
Author review: Pending human review; no human validation is claimed.
Prompts and key responses: Entries 001–027 below and the linked prompt archives.
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

## 013 — Clarify existing business behaviour before implementation

- **Timestamp:** 2026-10-20 10:04 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Bounded requirements interpretation and explanation of
  existing human-specified functions; documentation/disclosure maintenance.
- **Exact prompt and key response:** [Verbatim request and clarification response](prompts/013-business-behaviour-clarifications.md).
- **Key output:** Compared the existing function descriptions, schema, contract,
  F8 requirements, and consistency requirements. Identified unanswered existing
  cases concerning reservation reuse, versions, invalid states, missing accounts,
  history deltas/pagination, validation/errors, access checks, and implementation
  definitions. Explained the existing deterministic-key rule for identical release
  requests if an order is reserved again, and asked the human to clarify the
  relationship with F8.9.2. No new behaviour, schema/interface changes, locking
  strategy, prioritization, or decision rationale was selected or drafted.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/ai/prompts/013-business-behaviour-clarifications.md`, and this log.
- **Agent verification:** Read the recorded human decisions, SQL migrations,
  requirement references, current gRPC handler scaffold, and repository instructions.
  Checked documentation links, attribution pointers, the final README disclosure
  location, and whitespace. No code changed; build/runtime/database tests were
  not repeated for this documentation and clarification exchange.
- **Human review/edits:** Pending. Questions are not approved requirements or
  accepted design changes; the author must supply the decisions.
- **Sources/licensing:** Used only the repository and human-supplied material.
  No external source was consulted and no third-party code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Answers to the bounded clarification questions and
  finalized implementation definitions before dependent business code is generated.

## 014 — Record business definitions and implement reservation constraints

- **Timestamp:** 2026-10-20 11:30 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Formatting human-supplied business/implementation definitions,
  bounded consistency review and technical explanation, implementation and
  PostgreSQL tests for explicitly finalized schema constraints.
- **Exact prompt and key responses:** [Business rules/design, hash inputs,
  transaction flow, access rules, and clarification questions](prompts/014-business-rules-and-implementation-design.md).
- **Key output:** Recorded latest edge cases, version/error/validation rules,
  controller/service/repository responsibilities, READ COMMITTED transaction and
  lock order, distinct key/hash definitions, deferred client retries, and requested
  concurrency tests. Recorded the human's removal of disputes/F8.9.2 from scope.
  Added migration 004 for UNIQUE(order_id), SETTLED iff courier_id is set, and
  courier != requester. Did not choose history type changes, snapshot/cursor
  design, transaction binding, concrete resource locks, service authentication,
  extra enforcement mechanisms, error reason interface, or fallback semantics.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/migrations/004_reservation_invariants.sql`,
  `credit-service/grpc/test/reservation-invariants.test.cjs`,
  `credit-service/ai/prompts/014-business-rules-and-implementation-design.md`, and
  this log. The tested migration was applied to the local development database
  after a read-only check found no violating rows.
  Also updated `shared/grpc/README.md` and comment-only
  `shared/grpc/proto/credit.proto` documentation to distinguish the new plain-ID
  lookup keys from the SHA-256 request hash. Wire definitions/generated types
  were unchanged; regeneration was not required.
- **Agent verification:** All 15 credit migration/schema checks passed against
  PostgreSQL 17 using isolated temporary schemas, with zero skips/failures.
  Verified invalid existing rows roll back the migration without data repair,
  duplicates are rejected for all statuses, settlement/courier consistency and
  participant distinction hold, and preceding account/history/retry writes roll
  back following a constraint error. Temporary schemas were removed.
  Docker rebuild/start passed, including shared/credit TypeScript builds.
  Runtime checks confirmed migration 004 is packaged, all three local constraints
  are validated, and reservation-test schemas were removed. Affected-file header,
  log-pointer, local-link, final README disclosure, service-local AI directory,
  and whitespace checks passed.
  No main business handlers, service retry loop, or requested business-concurrency
  scenarios have been implemented or tested in this change.
- **Human review/edits:** Pending review of generated artifacts. All implemented
  schema constraints were explicitly supplied by the human. No human approval of
  the unanswered questions or generated implementation is inferred.
- **Sources/licensing:** Consulted primary [gRPC authentication](https://grpc.io/docs/guides/auth/),
  [deadlines](https://grpc.io/docs/guides/deadlines/),
  [PostgreSQL 17 explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html),
  [UUID types](https://www.postgresql.org/docs/17/datatype-uuid.html), and
  [READ COMMITTED visibility](https://www.postgresql.org/docs/17/transaction-iso.html).
  These support factual explanations, not AI-selected security/locking designs.
  No third-party implementation code was copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills were invoked.
- **Remaining human input:** Questions archived in exchange 014 about history
  values/pagination, concrete locking and transaction binding, caller/admin
  identity and permissions, error-metadata interface, UUID validation, missing
  retry-record reservation fallback, and database enforcement mechanisms.
  Client retry attempt/backoff/deadline policy remains for the later retry step.

## 015 — Record proposed userCreated-triggered initialization

- **Timestamp:** 2026-10-20 16:41 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Bounded interpretation/formatting of the human's proposed
  change and documentation/disclosure maintenance.
- **Exact prompt and key response:** [Proposed event workflow and response](prompts/015-proposed-user-created-initialization.md).
- **Key output:** Recorded that the human and User Service are considering a
  userCreated event as the initialization trigger. Related the proposal to the
  existing one-time/atomic grant and missing-account read rules. Identified event
  contract/transport, publication/processing/acknowledgment behaviour, replacement
  scope, and restoration distinction as human decisions before implementation.
  No architecture recommendations, event schema, broker, acknowledgment/retry
  strategy, or decision rationale was generated.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/ai/prompts/015-proposed-user-created-initialization.md`, and
  this log.
- **Agent verification:** Read repository instructions and current recorded
  decisions. Documentation attribution, pointers/links, final root README section,
  service-local records, and whitespace checks passed. No implementation, schema, database,
  dependencies, or gRPC wire definitions changed; tests/build were not repeated.
- **Human review/edits:** Pending. The human described the workflow as under
  consideration; this does not establish final authorization of an event design
  or removal of InitCredits.
- **Sources/licensing:** Used repository and human-supplied material only.
  No external source consulted and no third-party code copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input:** Final event workflow and contract definitions before
  dependent implementation. Earlier unrelated business-definition questions
  remain as recorded in exchange 014.

## 016 — Confirm user.created scope and remove initialization RPC

- **Timestamp:** 2026-10-20 17:31 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation and type regeneration of the human-decided
  RPC removal, bounded contract/integration verification, transport-test updates,
  and documentation formatting.
- **Exact prompt and key responses:** [Final event scope, delivery rules,
  read-only source inspection, and clarification questions](prompts/016-user-created-event-contract.md).
- **Key output:** Recorded RabbitMQ/shared messaging, the four supplied payload
  fields, acknowledgment after commit/verified prior grant, shared-client failure
  retries, User Service publication ownership, and one grant per userId even
  across different events. Removed InitCredits, its proto request/response,
  Promise wrapper, stub, and two generated types; regenerated/attributed fourteen
  remaining credit TypeScript files. Added exact eight-RPC/no-init-client coverage.
  No event queue, payload details beyond the supplied fields, consumer,
  inconsistent-account outcome, schema, or grant/locking logic was selected or
  implemented. Existing unrelated definitions remain pending.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`, `shared/grpc/README.md`,
  `shared/grpc/proto/credit.proto`, `shared/grpc/src/clients.ts`,
  `credit-service/grpc/src/grpc/server.ts`,
  `shared/grpc/test/credit-contract.test.cjs`,
  `shared/grpc/test/transport.test.cjs`,
  `shared/grpc/src/generated/credit.ts` and the thirteen remaining attributed
  generated credit messages/service types, deleted generated InitCreditsRequest.ts
  and InitCreditsResponse.ts, this log, and
  `credit-service/ai/prompts/016-user-created-event-contract.md`.
- **Agent verification:** Proto generation, full workspace build, and all nine
  shared transport/contract tests passed. Docker rebuild/start passed. Packaged
  runtime checks confirmed exactly eight RPCs, no initialization wrapper or
  retired generated message artifacts, and a reachable remaining scaffold.
  All 25 affected-file attributions, log pointers, documentation links, final root
  README disclosure, service-local AI records, and whitespace checks passed.
  No database migrations or business implementation changed;
  database tests were not repeated.
- **Read-only integration inspection:** GitHub CLI was unavailable and browser
  retrieval could not fetch the PR. Fetched refs/pull/57/head from origin for
  inspection only, without checkout or merge; inspected commit
  b8b924db95a60a36f9bc6b8c1880bf5ae96fb939. Verified shared-client ack/retry code
  and default MAX_RETRIES=3. Git tree/grep found no user.created contract/queue/
  publisher in that snapshot or this local branch; no publisher implementation
  is claimed to have been verified.
- **Human review/edits:** The human finalized event-triggered initialization
  and complete InitCredits RPC replacement. Generated code/docs await review.
- **Sources/licensing:** Read the repository and
  [PR 57](https://github.com/AY2627S1-CS3219-P22/FoC/pull/57), including its shared
  messaging implementation/README/topology and User Service registration code.
  No PR code was copied or merged. No architecture rationale or additional
  messaging pattern was generated.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input:** Publisher branch/file and exact queue, plus handling
  of an existing account without initial-grant evidence. Earlier history-type,
  lock/transaction and other business implementation definitions remain pending
  as recorded in exchange 014; grant uniqueness per userId is now explicit.

## 017 — Implement the credit-side user.created callback before the publisher

- **Timestamp:** 2026-10-20 21:02 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Callback/registration boilerplate and implementation from
  human-specified event/service behaviour; handler-boundary tests and bounded
  clarification of existing failure semantics.
- **Exact prompts and key response:** [Publisher-first assumption, permanent
  no-write failure, callback response, and questions](prompts/017-consumer-first-and-permanent-failure.md).
- **Key output:** Added user.created event shape, callback, and registration
  helper compatible with the inspected shared consumeFromQueue API. Registration
  accepts a connected shared client and a supplied queue, without selecting a
  queue name or installing/copying the unmerged shared package. The callback waits
  for initCredits completion, passes only userId, validates the supplied identity
  rules, and propagates service failures without successful completion.
  No grant transaction or alternate permanent-error API was selected in this
  initial callback slice; exchange 018 adds the transaction after human answers.
- **Affected locations:** `credit-service/grpc/src/messaging/userCreated.ts`,
  `credit-service/grpc/test/user-created.test.cjs`,
  `credit-service/ai/prompts/017-consumer-first-and-permanent-failure.md`,
  `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`, and this log.
- **Agent verification:** Callback/type build passed. The 19 then-current credit
  checks passed with PostgreSQL enabled, including the existing 15 migration
  checks and four callback-boundary tests. Refreshed PR 57 read-only; head remained
  b8b924db95a60a36f9bc6b8c1880bf5ae96fb939, whose client retries all rejected
  handlers without a permanent-failure special case. No broker was started or
  live acknowledgment/dead-letter routing tested.
- **Human review/edits:** Pending review of generated artifacts. The human
  authorizes implementation before the publisher exists and requires no writes
  or successful acknowledgment for an unconfirmed existing account.
- **Sources/licensing:** Read the previously inspected
  [shared client source](https://github.com/AY2627S1-CS3219-P22/FoC/blob/b8b924db95a60a36f9bc6b8c1880bf5ae96fb939/shared/messaging/src/index.ts)
  and repository conventions. No PR code was copied or merged.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input at this point:** Retry/dead-letter outcome,
  INITIAL_GRANT versus existing label, and concrete lock mechanism; resolved in
  exchange 018 except the namespace/string-to-bigint mapping.

## 018 — Implement INITIAL_GRANT transaction and PostgreSQL advisory locks

- **Timestamp:** Recorded 2026-10-20 21:11 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation and migration generation after human
  finalization, PostgreSQL documentation verification, integration/concurrency
  testing, and disclosure documentation.
- **Exact prompts and key responses:** [Bounded retry then dead-letter,
  INITIAL_GRANT, bigint transaction locks, requested verification, and remaining
  encoding question](prompts/018-initial-grant-and-advisory-locks.md).
- **Key output:** Added the initial-allocation slice of CreditService,
  CreditRepository, and SqlCreditRepository. CreditService owns one READ COMMITTED
  transaction and passes its connection to the repository. The repository locks
  supplied bigint identifiers with pg_advisory_xact_lock, without committing or
  rolling back. The service hashes the specified INIT/userId array, replays saved
  success, or locks the account and inserts account/history/result atomically.
  It confirms a prior grant through saved result or INITIAL_GRANT history,
  logs confirmed existing grants after completion, and fails an unconfirmed
  existing account with ALREADY_EXISTS and no writes. Added migration 005 to
  translate initial history to INITIAL_GRANT; other history/idempotency operation
  values remain unchanged. Declared @types/pg development dependency.
- **Key implementation limit:** A namespace/string-to-bigint encoder is a
  required constructor argument. No production encoding was selected; database
  tests use fixture-only numeric IDs. The callback/registration helper is ready
  for a connected shared client/queue/service, but the application entrypoint
  is not wired to RabbitMQ and no unmerged package was installed or copied.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`, `shared/grpc/README.md`,
  `credit-service/grpc/src/messaging/userCreated.ts`,
  `credit-service/grpc/src/services/{CreditService,validation}.ts`,
  `credit-service/grpc/src/repositories/{CreditRepository,SqlCreditRepository}.ts`,
  `credit-service/grpc/test/{initial-allocation,user-created}.test.cjs`,
  `credit-service/migrations/005_initial_grant_history_type.sql`,
  `credit-service/grpc/package.json`, `package-lock.json`,
  `credit-service/ai/prompts/018-initial-grant-and-advisory-locks.md`, and this log.
  JSON attribution uses the human-approved exception from entry 005.
- **Agent verification:** All 31 credit checks passed with PostgreSQL enabled and
  zero skips/failures. Verified migration of legacy history, single atomic grant,
  24 concurrent distinct event deliveries for one user, saved-response replay
  after changed balances, confirmed history without a saved result, no-write
  unconfirmed accounts/hash mismatch, failures at history/result insertion with
  rollback and later retry, actual advisory-lock timeout with rollback/retry,
  and lock release after commit and rollback. Full workspace build passed.
  Docker rebuild/start passed. Runtime verified packaged grant service/repository/
  callback modules, active migration 005, the PostgreSQL bigint advisory function,
  and cleanup of allocation-test schemas. All 15 affected documentation/code file
  headers, log pointers/local links, final README disclosure, service-local AI
  records, and whitespace checks passed.
  The tested migration was applied to the local development database.
  Initial tests without PGDATABASE skipped integration checks; the subsequent
  PostgreSQL-enabled runs passed all checks. No live RabbitMQ delivery was tested.
- **Human review/edits:** Pending review of generated artifacts. The human chose
  INITIAL_GRANT, transaction-level bigint advisory locks, and bounded retry then
  dead-letter. No new permanent-error mechanism or production lock encoding was
  generated as a design choice.
- **Sources/licensing:** Verified
  [PostgreSQL 17 advisory functions](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS),
  [transaction-lock lifetime](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS),
  and [node-postgres same-connection transactions](https://node-postgres.com/features/transactions).
  @types/pg 8.23.1 declares MIT in the lockfile. No third-party implementation
  code or PR package was copied/merged.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input:** Exact namespace/key-to-signed-bigint encoding.
  The shared package/queue are eventual integration inputs, rather than a
  prerequisite for the callback/transaction implementation. Other business
  operations and their earlier unresolved definitions remain outside this slice.

## 019 — Implement the human-finalized signed bigint advisory-key encoding

- **Timestamp:** 2026-10-20 22:00 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation from the human's exact algorithm,
  constructor/repository wiring, encoding/concurrency verification, and disclosure
  documentation.
- **Exact prompt and key response:** [Namespace/key JSON, UTF-8 SHA-256, first
  eight signed big-endian bytes, decimal-string SQL argument](prompts/019-advisory-lock-key-encoding.md).
- **Key output:** Added advisoryLockKey and wired every SqlCreditRepository
  advisory-lock call to it. Removed the temporary encoder type/constructor
  injection; CreditService now takes only its pool and the repository only its
  transaction connection. Replaced fixture numeric IDs in allocation/concurrency
  tests with the production mapping. No schema, RPC, namespace values, messaging
  topology, or grant behaviour changed.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/grpc/src/repositories/{CreditRepository,SqlCreditRepository,advisoryLockKey}.ts`,
  `credit-service/grpc/src/services/CreditService.ts`,
  `credit-service/grpc/test/{initial-allocation,advisory-lock-key}.test.cjs`,
  `credit-service/ai/prompts/019-advisory-lock-key-encoding.md`, and this log.
- **Agent verification:** Full workspace build and all 33 credit checks passed,
  with PostgreSQL enabled and zero skips/failures. Used independent Python
  hashlib/compact JSON/UTF-8/struct.unpack('>q') calculations to generate eight
  fixed vectors covering signs, values beyond Number precision, UTF-8, escaping,
  and namespace/key tuple boundaries. PostgreSQL tests directly contended for
  independently known signed bigint identifiers, confirming exact decimal SQL
  transport and release on commit/rollback. Existing concurrent allocation,
  duplicate replay, rollback, and lock-timeout checks now use the production
  encoder. Docker rebuild/start passed. Packaged runtime checks verified positive
  and negative vectors and cross-connection contention/release on the exact
  decimal bigint. All 11 affected code/documentation attributions, log pointers/
  local links, final README disclosure, service-local AI records, and whitespace
  checks passed. No schema, dependency, or persisted data changes were required.
- **Human review/edits:** The human finalized the complete encoding. Generated
  code/docs await human review; test success does not establish human approval.
- **Sources/licensing:** Used the human's exact algorithm, existing Node crypto/
  Buffer APIs, and previously recorded PostgreSQL references. Python standard
  library was used only to compute independent verification vectors. No new
  external source was consulted or third-party implementation code copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input:** No remaining advisory-key encoding question.
  Live RabbitMQ startup/shared-package integration and the other previously
  recorded business-operation definitions remain outside this encoding change.

## 020 — Begin remaining core credit logic; preserve human design decisions

- **Timestamp:** 2026-10-20 22:05 SGT (UTC+08:00).
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation of human-finalized balance/reservation
  reads and reservation update behaviour, SQL repository boilerplate, debugging/
  concurrency/rollback checks, bounded clarification of remaining definitions,
  and documentation/disclosure maintenance.
- **Exact prompt and key response:** [Core-logic request, explicit teammate
  integration ownership, implementation response, and clarification questions](prompts/020-remaining-core-business-logic.md).
- **Key output:** Added CreditService getBalance/getReservation/updateReservation,
  service-level error codes and the human's existing VERSION_CONFLICT reason.
  Added account saving, reservation find/create/save, typed reservation results,
  and generic saved-result typing. Added service-owned READ COMMITTED mutation
  handling: retry-key lock/replay, order-resource lock, work, atomic result save,
  commit/rollback. Update validates and follows the supplied check order,
  locks the account before reading its balance, changes reserved credits by
  difference, increments version once, writes signed update history and saves
  the response together. Reads never create accounts or write history.
- **Boundaries:** RabbitMQ startup and User Service implementation are explicitly
  assigned to teammates. No new history enum, UUID-format policy, pagination/
  snapshot design, caller authentication, reason-metadata interface, or missing
  retry-record Reserve fallback was selected. Existing update history value is
  retained. Reserve/release/settle/history and controller wiring await those
  definitions; this entry does not claim all core logic is finished.
- **Affected locations:** `README.md`, `credit-service/README.md`,
  `credit-service/docs/user-decisions.md`,
  `credit-service/grpc/src/repositories/{CreditRepository,SqlCreditRepository}.ts`,
  `credit-service/grpc/src/services/{CreditService,validation}.ts`,
  `credit-service/grpc/test/core-credit.test.cjs`,
  `credit-service/ai/prompts/020-remaining-core-business-logic.md`, and this log.
- **Agent verification:** All 44 credit checks passed with PostgreSQL enabled,
  zero failures/skips. The 11 new core checks verify pre-connection validation,
  no-write balance/reservation reads, signed hold differences, using the existing
  hold when increasing to the full total balance, rejection without state changes,
  replay before version checks, shared-version concurrency, shared-account
  overspend prevention, and injected history/result failures with full rollback
  and later retry. Temporary schemas are removed. Full workspace build and Docker
  rebuild/start passed. Runtime verified packaged core methods, no implicit
  account creation, missing reservation reads, and cleaned core-test schemas.
  Affected-file attributions/log pointers, local links, final README disclosure,
  service-local AI records, and whitespace checks passed. No schema/dependency or
  persisted application-data changes were required.
- **Human review/edits:** Pending review of generated artifacts and answers to
  the recorded remaining behaviour/interface questions. Existing user changes
  are preserved; no reviewer approval is inferred from tests.
- **Sources/licensing:** Used the human's recorded requirements and repository
  implementation conventions. No new external source was consulted or
  third-party implementation code copied.
- **Instruction files used:** Root `AGENTS.md` and empty
  `credit-service/AGENTS.md`. No skills invoked.
- **Remaining human input:** Full history labels, history cursor/snapshot
  semantics, existing-reservation fallback without retry record, UUID validation,
  and controller service identity/history permissions/reason metadata.

## 021 — Implement finalized reservation mutations, history schema, and authentication

- **Timestamp:** Began 2026-10-20 23:45 SGT (UTC+08:00); verification/documentation
  continued into 2026-10-21 00:07 SGT alongside exchange 022.
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation from human-finalized business/schema/access
  definitions, generated contract boilerplate, debugging and integration tests,
  bounded wire-detail clarification, documentation/disclosure maintenance.
- **Exact prompts/key exchanges:** [Four exact answers, key responses, and the
  REST follow-up question](prompts/021-history-and-authentication.md). Original
  questions are in exchange 020; the REST answer is in exchange 022.
- **Key output:** Implemented reserve/release/settle with service-owned READ
  COMMITTED transactions, retry/order/account locks, atomic balances/reservation/
  signed history/results, saved-response replay, exact missing-record fallbacks,
  named error reasons, UUID validation before connection, account ordering, and
  full rollback. Update now writes the human's exact RESERVARTION_UPDATED label.
  Migration 006 converts legacy labels, adds always-generated bigint sequence_id,
  unique/user-desc indexes and a partial unique INITIAL_GRANT index. Applied
  migrations 001–005 were preserved; 006 also handles init_credits for legacy
  input. Idempotency operation names remain unchanged. SQL history querying
  supports sequence boundaries and keeps bigint values as strings.
- **Contract/controller:** Removed both history RPCs, history request/page/entry
  messages, generated files and client wrappers; regenerated remaining credit
  types with attribution restored. Connected six order-only RPCs with secret-
  derived identity, constant-time SHA-256 digest comparison, authentication before
  business logic, reason trailers, transient error mapping, and TLS required
  unless explicit local mode. Added RS256 user-token verification for the
  subsequent REST integration. Configured local service-token/TLS variables.
- **Affected locations:** Root README; credit-service README, usage log, prompt
  archive 021, docs/user-decisions.md, compose.yaml, .env.docker.example,
  grpc/.env.example, grpc/package.json; root package-lock.json;
  credit-service/migrations/006_history_types_and_paging.sql;
  grpc/src/api/{auth,errors,tls}.ts, src/{env,index}.ts,
  src/grpc/server.ts, src/services/{CreditService,validation}.ts,
  src/repositories/{CreditRepository,SqlCreditRepository}.ts;
  tests auth/core-credit/history/initial-allocation;
  shared/grpc README, proto/credit.proto, src/clients.ts,
  src/generated/credit.ts and regenerated/removed credit types,
  test/{credit-contract,transport}.test.cjs. Existing earlier uncommitted work
  was preserved. Exchange 022 subsequently extends the overlapping files.
- **Dependency attribution:** Added jsonwebtoken ^9.0.3 and development
  @types/jsonwebtoken ^9.0.10, matching the existing User Service declarations.
  The human-approved JSON attribution exception is documented in the service
  README and this log. No package manifest header comment was added.
- **Agent verification:** Before REST completion, all 65 credit checks passed
  with PostgreSQL enabled, zero failures/skips; eight shared tests and full
  workspace build passed. Added tests verify parallel reserves/no overspend,
  12 duplicate reserves, missing-record no-write fallbacks in all statuses,
  competing settle/release, opposing settlements without deadlock, missing/self
  couriers, full rollback on the second transfer history row, exact migration
  conversions and rollback for duplicate grants/ambiguous legacy transfers,
  sequence ordering/precision beyond 2^53, writes during paging and late commits,
  six-RPC authentication, unauthorized identities, error trailers, JWT validation,
  and TLS configuration. Scoped coverage before REST was 98.14% lines/94.03%
  branches. Initial sandboxed network tests failed EPERM; reruns with approved
  local listener/database access passed. No such failure was treated as success.
  Migration 006 was applied once to the local development database. Docker
  rebuild/start and no-write runtime token/error/UUID checks passed. After
  exchange 022, the suite has 70 passing credit checks; see below.
- **Human review:** Pending review of generated implementation/docs. The human
  supplied the decisions; agent-run checks do not establish human validation.
  Root AGENTS.md and existing empty credit-service/AGENTS.md were used. No skills
  invoked. No agent delegation, commit, PR, merge, or deployment was performed.
- **Sources/licensing:** Verified PostgreSQL 17
  [identity columns](https://www.postgresql.org/docs/17/ddl-identity-columns.html)
  and [transaction timestamps](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT),
  [jsonwebtoken verification](https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback),
  [Node timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b),
  and [gRPC authentication](https://grpc.io/docs/guides/auth/). Prior PostgreSQL
  advisory-lock references are recorded in entries 018–019. No third-party
  implementation code was copied. No new license-compatibility assurance or
  human review is claimed.
- **Scope:** RabbitMQ startup and User Service implementation remain with
  teammates. REST paths/bookmark shape were left pending until the human's
  answer in exchange 022. No new schema/interface choices filled those gaps.

## 022 — Implement human-finalized own-balance/history REST and bookmarks

- **Timestamp:** 2026-10-21 00:01–00:11 SGT (UTC+08:00), with final documentation
  and checks completed during this same session.
- **Tool/model:** OpenAI Codex, GPT-6.
- **Modes/scenario:** Implementation after human wire definitions, startup and
  Docker boilerplate, meaningful pagination/authentication tests, documentation.
- **Exact prompt/key response:** [REST paths, fields, bookmark definition, and
  implementation response](prompts/022-rest-wire-details.md).
- **Key output:** Added getUserCreditHistory with default 50/max 100, sequence-
  descending limit+1 queries, scoped bookmarks, and null final token. Added
  strict base64url/UTF-8/JSON decoding: exactly userId/sequenceId, current subject,
  positive digits-only decimal sequence with no leading zeros within signed
  bigint range. Added GET /credits/me/balance and GET /credits/me/history with
  optional pageSize/pageToken, camelCase responses, ISO UTC dates, null links,
  decimal sequenceId, and error/message payloads. The RS256 subject selects the
  user; query IDs and admin claims provide no additional reach. Connected REST
  port 3004 startup/shutdown alongside gRPC 50054. Docker mounts only the User
  Service public PEM read-only, never its private key. No key contents/tokens
  were written to disclosures. Tests generate their own temporary RSA keys.
- **Affected locations:** credit-service/grpc/src/services/{CreditService,
  historyBookmark}.ts; src/api/{rest,errors}.ts; src/index.ts;
  test/{rest,history,auth}.test.cjs; credit-service/Dockerfile, compose.yaml,
  .env.docker.example, README.md, docs/user-decisions.md, ai/usage-log.md and
  prompts/022-rest-wire-details.md; shared/grpc/README.md; root README.
- **Agent verification:** Full workspace build passed. All 70 credit checks
  passed with PostgreSQL and local listeners, no failures/skips. Eight shared
  contract/transport checks passed. New REST/bookmark tests cover malformed,
  extra/missing/wrong-user fields, invalid UTF-8/base64url/JSON, numeric precision/
  signed-bigint bounds, sizes before DB connection, RS256 expiry/subject,
  admin subject isolation, ISO/null serialization, query parsing/errors,
  103-entry paging with 50/100 sizes, writes after page one, unknown-user empty
  history, and service/internal error handling. Scoped Node coverage command:
  `node --experimental-test-coverage '--test-coverage-include=**/credit-service/grpc/src/{services,repositories,messaging,api,grpc}/**/*.ts' --test credit-service/grpc/test/*.test.cjs`
  with local PG variables reported 98.29% lines, 94.44% branches, 98.16% functions.
  Startup/env/generated code is excluded from that report. Docker rebuild/start
  passed; logs confirm both listeners. Runtime no-write checks confirm both REST
  reads reject absent/invalid JWTs with 401 error/message, and authenticated gRPC
  returns NOT_FOUND with ACCOUNT_NOT_FOUND trailers. Actual User Service private
  signing keys were not read for runtime tests; successful JWT behavior was
  exercised with generated test keys. Temporary database schemas are removed.
  A final debugging check inspected installed pg-pool/pg connection errors:
  code-less pool acquisition timeout, connection timeout, and unexpected disconnect
  messages now map to UNAVAILABLE as required for transient database failures.
  Assertions were added to the existing error-classification test; all 70 checks
  passed again and the credit build/Docker rebuild passed. Final current-doc link,
  attribution/header pointer, root README last-section, service-local AI location,
  and tracked diff whitespace checks passed. Prompt archives retain original
  trailing whitespace where supplied by the human.
- **Human review:** Pending. Root AGENTS.md and the existing empty service
  AGENTS.md used; no skills invoked. Existing personal env files and teammates'
  implementations were not edited. No commit/merge/publication performed.
- **Sources/licensing:** Used the human's exact wire definitions and existing
  User Service authenticate/error payload conventions. Source references for
  JWT/crypto/PostgreSQL are in entry 021. No copied third-party implementation.
- **Remaining integration:** RabbitMQ startup/User Service event publication are
  explicitly teammate-owned. Application retries in createCreditClient are a
  subsequent requested integration and are not implemented here; finite
  deadlines/codes/trailers are preserved. Archival/restoration remain deferred.

## 023 — Explain current directory layout; request the human's remaining layout choice

- **Timestamp:** 2026-10-21 00:15 SGT (UTC+08:00).
- **Tool/model and mode:** OpenAI Codex, GPT-6; explanation of existing files,
  bounded clarification, and disclosure documentation.
- **Exact prompt/key response:** [Directory-layout question](prompts/023-directory-layout-question.md).
- **Key output:** Inspected the existing paths. grpc is currently the Node
  workspace containing REST handlers, service/repository code and startup, as
  well as gRPC. Recorded the human's proposed sibling grpc/rest folders and
  requested their placement of shared business/repository/startup code. No
  target architecture or layout was proposed or selected by AI; no source files
  were moved and no workspace/package boundaries changed.
- **Affected files:** This log, prompt archive 023, service README attribution,
  and the root README's final consolidated disclosure.
- **Checks:** Read-only file listing; disclosure links and tracked diff whitespace.
  No code changed; no new build/test run was necessary. Earlier verification
  results remain in entries 021–022.
- **Review/sources:** Human target-layout decision and review pending. Used
  repository files and the user's existing rules; no external sources/code or
  skills. Root AGENTS.md and existing service instructions still apply.

## 024 — Relocate Credit Service to the human-finalized src layout

- **Timestamp:** 2026-10-21 00:21–00:29 SGT (UTC+08:00).
- **Tool/model and modes:** OpenAI Codex, GPT-6; refactoring/implementation of
  the human's explicit directory placement, configuration boilerplate, debugging,
  verification, documentation and disclosure maintenance.
- **Exact prompt/key responses:** [Human-finalized source layout and recorded
  responses](prompts/024-service-src-layout.md). This resolves the layout question
  in entry 023. The assistant did not select the requested layer directories.
- **Key output:** Source now lives at credit-service/src with domains, repos,
  services, grpc, rest, events, env.ts and index.ts. Moved existing entity type
  declarations unchanged from CreditRepository into domains/types.ts. Repositories
  moved to repos and the user.created helper to events. Existing service-secret
  and user-JWT verifier functions are in their respective grpc/rest directories;
  handlers catch each transport's corresponding authentication error. TLS/error
  mapping resides with gRPC, retaining REST's existing use of the shared mapping.
  Package files, test, scripts and .env.example moved to the credit-service root.
  The npm identifier @foc/credit-grpc and existing commands are preserved; its
  workspace/link path is credit-service. Updated imports, TypeScript build,
  migration-test relative paths, public-key default/example relative path,
  shared transport-test compiled-module lookup, Docker COPY/working directory,
  Supplier Dockerfile's credit-manifest COPY path, and current documentation.
  Removed the obsolete ignored compiled output and empty outer grpc directory.
  No personal env content was read or overwritten. Existing SQL migrations,
  schema, business rules, RPC/REST fields and historical prompt archives remain.
- **Affected locations:** Root AGENTS.md (manifest path only), package.json,
  package-lock.json and final README disclosure; credit-service/package.json,
  tsconfig.json, .env.example, Dockerfile, src/**, test/**, scripts/**, README.md,
  docs/user-decisions.md, this log and prompt archive 024; retired authored paths
  under credit-service/grpc; shared/grpc README and test/transport.test.cjs;
  supplier-service/Dockerfile.grpc (credit manifest path and attribution only).
  Files have updated attribution pointers after relocation. AI records remain
  exclusively under credit-service/ai.
- **JSON attribution:** The relocated manifest and root lock continue to use
  the method approved in entry 005. The necessary root package.json workspace
  path edit is attributed using the same comment-free JSON documentation method
  in the service README and this log. tsconfig uses TypeScript-supported JSONC
  attribution comments; its compiler settings are unchanged.
- **Agent verification:** Full workspace build passed. All 70 credit tests
  passed against PostgreSQL/local listeners, no failures/skips; all eight shared
  contract/transport tests passed using the new compiled module path. The
  existing migration CLI/schema tests passed with relocated scripts/migrations.
  npm workspace link now resolves to credit-service. Two offline install
  attempts failed because registry metadata was not cached; an approved online
  npm install completed. Docker npm ci, compilation, image rebuild and startup
  passed. Runtime no-write tests confirmed both REST routes reject absent JWTs,
  unauthenticated gRPC rejection, authenticated NOT_FOUND/ACCOUNT_NOT_FOUND
  trailers, and the new /repo/credit-service working directory plus packaged
  dist/grpc, dist/rest, scripts and migrations paths. The Supplier image was not
  separately rebuilt; its single changed COPY source was checked to exist.
  Header/log pointers, current documentation links, root README's final
  disclosure placement and tracked diff whitespace were checked. No new tests
  were added for the file move; the existing behavior tests verified it.
  The coverage figures in entry 022 remain that earlier run, not a fresh
  post-relocation coverage measurement.
- **Review/sources/instructions:** Human review pending. Used repository files
  and the human's exact layout; no new external sources or third-party code.
  Read root AGENTS.md, the existing empty credit-service/AGENTS.md and
  supplier-service/AGENTS.md for the necessary Dockerfile path update. No skill
  was invoked. No source schema/architecture rationale or trade-off analysis
  was generated. No agent delegation, commit, merge or deployment performed.
- **Remaining integrations:** RabbitMQ startup/User Service publication remain
  teammate-owned. Client application retries and archival/restoration were not
  part of this directory refactor and remain as recorded earlier.

## 025 — Correct history spelling, typed validation, mutation documentation and REST routing

- **Timestamp:** 2026-10-21 01:56–02:04 SGT (UTC+08:00).
- **Tool/model and modes:** OpenAI Codex, GPT-6; human-directed implementation/
  debugging, meaningful regression tests, bounded clarification, documentation
  and disclosure maintenance.
- **Exact prompt/key exchanges:** [Full request, migration/error confirmations,
  and key responses](prompts/025-validation-routing-and-spelling.md).
- **Human decisions:** Correct RESERVARTION_UPDATED to RESERVATION_UPDATED.
  The human confirms no shared database has applied migration 006; it may be
  edited in place. Existing business/authentication/transient error mappings
  must remain; only unexpected failures use generic INTERNAL/500. Match REST
  routes before authentication; retain unsupported-method 404 as the requested
  known limitation. Document saved mutation response snapshots/GetReservation.
- **Key output:** Edited migration 006's legacy update conversion/type check
  in place and changed CreditService's update history to RESERVATION_UPDATED.
  Added ValidationError extends Error for deliberate identifier/amount/version/
  page-size/bookmark/event validation. Only that class maps to INVALID_ARGUMENT
  and REST 400. Ordinary TypeError stays unexpected, producing generic Internal
  credit-service error and logging the original error on the server. Known
  business reasons, authentication, and transient-database codes are preserved.
  Bookmark decoding converts only expected malformed JSON/UTF-8 input failures;
  unexpected decoder exceptions propagate. REST now authenticates only after a
  known GET route is matched. Unknown paths and unsupported methods return 404;
  known GET routes without a token return 401. Added proto/README mutation
  snapshot wording; no wire fields or replay behavior changed. Historical prompt
  archives and prior log entries retain their original spelling.
- **Local database correction:** Migration 006 had already run locally. In one
  transaction locked public.credit_history, dropped its type check, updated
  the misspelled label to RESERVATION_UPDATED, and installed the corrected check
  from migration 006. Committed after verifying unchanged non-type row data,
  row count, and all index definitions. Zero local rows required renaming; the
  check was corrected. No sequence/identity/index statement was rerun, no data
  reset, and no follow-up migration 007 added. External shared deployments were
  not inspected; the human supplied the no-shared-application confirmation.
- **Affected locations:** credit-service/migrations/006_history_types_and_paging.sql;
  src/services/{CreditService,validation,historyBookmark}.ts;
  src/grpc/errors.ts; src/rest/server.ts; src/events/userCreated.ts;
  test/{auth,core-credit,initial-allocation,rest,history,user-created}.test.cjs;
  credit-service README, docs/user-decisions.md, this log and prompt archive 025;
  shared/grpc/proto/credit.proto and README; root README final disclosure.
- **Agent verification:** Full workspace build passed. All 74 credit tests
  passed with PostgreSQL and temporary API listeners, no failures/skips. Eight
  shared contract/transport tests passed. New regression coverage checks an
  ordinary TypeError from a real service call returns generic gRPC INTERNAL,
  no private message/reason trailer, and the exact error object is logged;
  HTTP service TypeError returns generic 500 and the original error is logged;
  intentional validation remains INVALID_ARGUMENT/400 without a DB connection;
  known mappings remain; unknown paths without tokens are 404, both known GET
  routes without tokens are 401, POST to either route is 404 with/without a
  valid token; and saved reserve snapshots replay after updates/releases while
  GetReservation returns current state, without writes. Updated fresh-schema
  migration tests accept the corrected label and reject the old typo. The local
  database correction verified row/index preservation. Code generation ran for
  the proto comment change; generated bodies were unchanged and prior generated
  files/attributions were retained. Docker rebuild/start passed. No-write runtime
  checks verified REST 404/401/POST404, typed INVALID_ARGUMENT, and preserved
  NOT_FOUND/ACCOUNT_NOT_FOUND behavior. Header/log/documentation links and
  tracked diff whitespace checked. Coverage figures from entry 022 remain
  historical, not a new run for these changes.
- **Human review/sources/instructions:** Human review pending. Used the human's
  decisions and repository code/tests; no new external sources or copied
  third-party implementation. Read root AGENTS.md and existing empty service
  AGENTS.md. No skill, delegation, commit, merge or deployment performed.
- **Remaining integrations:** RabbitMQ startup/User Service publication remain
  teammate-owned; automatic client retries and archival/restoration are unchanged.

## 026 — Restore balance user IDs and return full reservations for lookups

- **Timestamp:** Began 2026-10-21 12:07 SGT (UTC+08:00); implementation and
  verification completed during this session.
- **Tool/model and modes:** OpenAI Codex, GPT-6; implementation of the human's
  explicit contract changes, regeneration boilerplate, regression verification,
  documentation and disclosure maintenance.
- **Exact prompt/key responses:** [Read-contract expansion request and key
  implementation responses](prompts/026-expanded-read-responses.md).
- **Human-defined change:** Restore string user_id = 1 in Balance and return
  userId from CreditService.getBalance. GetReservation must return the same full
  Reservation as mutations instead of the separate three-field response. No
  additional schema/interface decision was selected by AI.
- **Key output:** Restored balance field 1 and removed its user_id reservation;
  timestamp reservations and credit field numbers remain. getBalance returns the
  account's userId. GetReservation uses Reservation in the proto, generated
  service/client types and wrapper. Its controller directly forwards the full
  service result. Removed the obsolete GetReservationResponse message and
  generated source/ignored compiled output. Existing courier optional-presence
  behavior is retained. REST now forwards the service's four-field balance
  directly. The internal initialization return and event callback use
  Omit<Balance, 'userId'> at type level to preserve existing three-credit
  initialization results and persisted replay responses; no stored result was
  rewritten or initialization behavior changed. No SQL/migration change.
- **Affected locations:** shared/grpc/proto/credit.proto; src/clients.ts;
  src/generated/credit.ts, credit/{Balance,CreditService}.ts and retired
  credit/GetReservationResponse.ts; test/credit-contract.test.cjs; shared README;
  credit-service/src/services/CreditService.ts, src/grpc/server.ts,
  src/rest/server.ts, src/events/userCreated.ts;
  test/{core-credit,auth,rest}.test.cjs; credit-service README,
  docs/user-decisions.md, this log and prompt archive 026; root README final
  disclosure. Prior human-review markers remain, with entry-026 edits marked
  pending human review.
- **Agent verification:** Full workspace build passed after resolving the
  compiler's duplicate userId warning by forwarding the service balance from
  REST. All 74 credit checks passed with PostgreSQL and temporary API listeners,
  zero failures/skips; eight shared wire/transport checks passed. Existing tests
  were updated rather than adding redundant tests: real service balance reads
  assert user identity across mutation/concurrency cases; controller and shared
  wire tests assert the full reservation fields, including optional courier for
  settlement and its absence for active holds; REST still returns its four
  fields and applies JWT subject scope. Initial allocation/replay tests still
  verify the existing internal result shape. Regenerated types, restored
  attribution, and removed only the retired compiled response type. Docker
  clean compilation/rebuild/start passed. Packaged server/client runtime checks
  verify balance identity and full reservation serialization with isolated
  in-memory fixtures; no application-data writes. Current attribution/log/docs
  links, the final root README disclosure and tracked whitespace checked.
  Earlier coverage numbers are historical; coverage was not rerun here.
- **Human review/sources/instructions:** New edits await human review. Used the
  human's exact contract and repository implementation/generation conventions;
  no new external source or third-party implementation code. Read root AGENTS.md
  and existing empty service AGENTS.md. No skill, agent delegation, commit,
  merge or deployment performed.
- **Remaining integrations:** RabbitMQ startup/User Service publication remain
  teammate-owned; automatic client retries and archival/restoration are unchanged.

## 027 — Shared Credit client retry request

- **Timestamp:** 2026-10-21 16:28 SGT (UTC+08:00).
- **Completion timestamp:** 2026-10-21 16:50 SGT (UTC+08:00).
- **Tool/model and modes:** OpenAI Codex, GPT-6; bounded requirements
  interpretation, implementation after human finalization, regression testing,
  documentation and disclosure maintenance.
- **Exact prompt/key responses:** [Retry request, exact human answers and
  implementation/check results](prompts/027-shared-credit-retries.md).
- **Human-defined behavior:** Cover all six Credit RPCs using an application
  loop, at most three total attempts, short growing/capped/jittered backoff,
  one deadline covering attempts and delays, no retry after the client's deadline,
  no retry when its delay consumes the remaining budget, and return the last
  error unchanged. Earlier retryable codes remain UNAVAILABLE, ABORTED and
  DEADLINE_EXCEEDED. The human then finalized a 1,300 ms budget; 50 ms initial
  delay, growth factor 2, 500 ms cap, half-base plus random-half jitter; each
  attempt uses the remaining time; defaults allow optional client and per-call
  overrides. No separate per-attempt cap was introduced.
- **Key output:** All six shared Credit wrappers use the application loop and
  one absolute deadline. Client/per-call fields are maxAttempts, initialDelayMs,
  backoffMultiplier, maxDelayMs, plus the existing timeoutMs/deadline. Overrides
  merge individually. Retryable codes only are retried. Delay >= remaining time
  skips the wait/retry; late timers cannot start an expired attempt. The original
  last error is thrown unchanged. Already expired upstream calls reject with
  DEADLINE_EXCEEDED without a transport attempt. Other service clients retain
  their behavior. Existing explicit timeoutMs, including createPeerClients
  configuration, overrides the new Credit default. No proto/schema change.
- **Affected locations:** shared/grpc/src/clients.ts and
  test/credit-retries.test.cjs; shared and credit-service READMEs; this log,
  prompt archive 027, and the root README final disclosure.
- **Agent verification:** Full workspace build, 51 shared checks (43 new retry
  checks), and all 74 credit checks against PostgreSQL/local listeners passed,
  zero failures/skips in the completed runs. Coverage includes all six methods,
  status selection, exact error identity/trailers, configuration precedence,
  jitter bounds/capping, whole-call and upstream deadlines, skipped delays,
  late timers, and real wire metadata/request/error preservation. The initial
  sandbox-only listener check failed with EPERM; authorized local-listener
  rerun passed. Diff whitespace checked. No Order retry implementation was found
  in this checkout; no teammate branches were inspected.
- **Human review/sources/instructions:** Human review pending. Read root
  AGENTS.md and the empty credit-service/AGENTS.md. Used repository sources;
  no external source, copied third-party code, new dependency, skill, delegation,
  commit, publication, or deployment. Prior PR-only drafting remains
  excluded from repository logs as explicitly requested by the human.

For each later entry, record the same fields and update the README and affected
file headers. Record actual human edits, acceptances, or rejections only when the
human provides them.
