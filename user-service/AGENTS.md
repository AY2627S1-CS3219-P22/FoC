# AGENTS.md — User Service

Context and rules for AI coding agents working in `user-service/`.
Humans: see `README.md`. This file is the source of truth for the rules below —
keep it updated when a rule changes.

## What this is
The User Service of Friend on Campus (FoC), a microservices monorepo
(one service per folder). Covers account creation, login/logout, profile
management, role-based access control, and OTP email verification (FR F1–F4).

## Stack (do not substitute without team agreement)
- Node.js + TypeScript, Express (REST), `@grpc/grpc-js` + `@grpc/proto-loader` (RPC)
- Prisma + PostgreSQL
- zod (validation), bcrypt (password hashing), dotenv (config)
- Dev runner: `tsx`. Formatting: prettier (no ESLint).

## Rules
- **Use `@grpc/grpc-js`, never the deprecated `grpc` package.**
- **Roles are an enum array (`Roles[]`), never a single field.** An account can
  hold USER and ADMINISTRATOR at once.
- **Schema changes go through `prisma migrate dev`, never `db push`.**
- **No cross-service database access.** This service owns its own DB/schema; talk
  to other services over gRPC/REST only.
- **Passwords are hashed (bcrypt), never encrypted/decrypted.**
- **`/health` must ping the database**, not just return 200.
- Validate all input with zod (password rules: min 8 chars, ≥1 special, ≥1
  uppercase, ≥1 numeric — F1.1.2).
- Ports: REST on `3001`, gRPC on `50052` (both configurable via `.env`).

## Before making architectural decisions
If you introduce a new rule or convention, add it here (with a short rationale)
so the team stays consistent.
