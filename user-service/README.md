# User Service — Friend on Campus (FoC)

Accounts, login/logout, profile management, role-based access control, and
OTP email verification (FR F1–F4).

- **Agent rules & conventions:** [`AGENTS.md`](./AGENTS.md)

## Stack

Node.js + TypeScript · Express (REST) · `@grpc/grpc-js` (internal RPC) ·
Prisma + PostgreSQL · zod · bcrypt.

## Prerequisites

- **Node.js 20+** and npm
- **Docker Desktop** (for PostgreSQL) — must be running

This service owns its **own database** — it does not share Postgres with the
other services. Everything below runs against a Postgres container defined in
this folder's `compose.yaml`.

---

## Setup — pick one path

There are two ways to run this service. Choose based on what you're doing.

### Path A — Quick run ("just start it") 🚀

Use this when you just want the service **up and running** (e.g. to try it, demo
it, or work on another service that calls it). Everything runs in Docker; you
don't need Node installed for this path.

```bash
docker compose up --build
```

That single command starts Postgres, waits until it's healthy, then builds and
starts the service — which **automatically applies database migrations** before
booting. When it's ready you'll have:

- REST API on <http://localhost:3001>
- gRPC on `localhost:50052`

Stop it with `Ctrl+C`, or wipe everything (including the database) with
`docker compose down -v`.

> **Note:** this path applies migrations that are already committed in
> `prisma/migrations/`. It does **not** create new ones — that's a dev task
> (Path B, step 4).

### Path B — Dev setup (hot reload, for writing code) 🛠️

Use this when you're **developing** the service. Only Postgres runs in Docker;
the app runs on your machine so it **hot-reloads on every save** and is easy to
debug.

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file (edit values if needed)
cp .env.example .env

# 3. Start ONLY the database
docker compose up -d postgres

# 4. Create + apply the database schema
#    (first time, Prisma asks for a migration name — use "init")
npm run prisma:migrate

# 5. Run the service with hot reload (starts REST + gRPC)
npm run dev
```

Leave `npm run dev` running; edit files and it restarts automatically. Stop with
`Ctrl+C`. The Postgres container keeps running in the background — stop it with
`docker compose stop postgres` when you're done for the day.

---

## Verify it works

With the service running (either path), in another terminal:

```bash
curl -i http://localhost:3001/health
```

- **`200 { "status": "ok", "db": "up" }`** → all good: server is up and the
  database is reachable.
- **`503 { "status": "degraded", "db": "down" }`** → the server is running but
  can't reach Postgres (see Troubleshooting).

The health check deliberately pings the database, so a `200` means the DB
connection genuinely works — not just that the web server started.

---

## Troubleshooting

### `P1010: User was denied access` / health returns `db: down`

Almost always a **port 5432 conflict**: you already have a local Postgres (e.g.
Homebrew `postgresql@14`) running, so connections to `localhost:5432` hit *that*
instead of this service's container.

Check what's on the port:

```bash
lsof -nP -i :5432
```

If you see a non-Docker `postgres` process, either:

- **Stop your local Postgres** (keeps the standard port):
  ```bash
  brew services stop postgresql@14   # adjust the version to match yours
  ```
- **or** change the container's host port in `compose.yaml` to `"5433:5432"` and
  update `DATABASE_URL` in `.env` to use `:5433`.

### `docker compose` can't connect / "Cannot connect to the Docker daemon"

Docker Desktop isn't running. Start it and wait for it to finish booting.

### Reset the database completely

```bash
docker compose down -v   # removes the Postgres data volume
docker compose up -d postgres
npm run prisma:migrate
```

---

## Scripts

| Command                   | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Start REST + gRPC with hot reload (`tsx`)     |
| `npm run build`           | `prisma generate` + compile TypeScript        |
| `npm start`               | Run the compiled build (`dist/`)              |
| `npm run prisma:migrate`  | Create & apply a migration (`migrate dev`)    |
| `npm run prisma:generate` | Regenerate the Prisma client                  |
| `npm run format`          | Format code with Prettier                     |

## Environment variables

Copy `.env.example` → `.env`. `.env` is gitignored — never commit real secrets.

| Variable       | Purpose                          | Default (local)     |
| -------------- | -------------------------------- | ------------------- |
| `DATABASE_URL` | Postgres connection string       | see `.env.example`  |
| `PORT`         | REST (Express) port              | `3001`              |
| `GRPC_PORT`    | gRPC port (internal profile RPC) | `50052`             |

## Project layout

```text
user-service/
├── prisma/
│   ├── schema.prisma      # User model + Roles enum
│   └── migrations/        # versioned schema history — commit these
├── proto/user.proto       # internal gRPC contract (F2.6)
├── src/
│   ├── index.ts           # boots REST + gRPC
│   ├── env.ts             # zod-validated config
│   ├── db.ts              # Prisma client + DB ping
│   ├── rest/app.ts        # Express app + /health
│   └── grpc/server.ts     # gRPC server
├── compose.yaml           # this service's Postgres (+ service)
└── Dockerfile
```
