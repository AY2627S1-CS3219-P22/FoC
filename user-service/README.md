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

> **First-time only — generate the JWT signing keys** (both paths need them; they
> are git-ignored and never committed):
>
> ```bash
> npm run keys:generate
> ```
>
> This creates `keys/private.pem` (this service signs tokens with it — keep it
> secret) and `keys/public.pem` (other services verify tokens with it — safe to
> share). The service refuses to boot if the keys are missing. See
> [Integrating with this service](#integrating-with-this-service-other-services).

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

# 3. Generate the JWT signing keys (first time only; required to boot)
npm run keys:generate

# 4. Start ONLY the database
docker compose up -d postgres

# 5. Create + apply the database schema
#    (first time, Prisma asks for a migration name — use "init")
npm run prisma:migrate

# 6. Run the service with hot reload (starts REST + gRPC)
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

## Authentication & Authorization

Login issues a **stateless RS256 JWT** carrying the user's id (`sub`) and `roles`.
Protected routes run two middlewares: `authenticate` (verifies the token → `401`
if missing/invalid) then `requireRole(...)` (checks role claims → `403` if not
allowed). Roles: `USER` (default) and `ADMINISTRATOR`.

| Method | Route              | Access                | Purpose                          |
| ------ | ------------------ | --------------------- | -------------------------------- |
| POST   | `/users/register`  | public                | Create an account (F1)           |
| POST   | `/users/login`     | public                | Verify credentials → return JWT  |
| GET    | `/users/me`        | any authenticated     | Own profile (F2.3)               |
| GET    | `/users`           | `ADMINISTRATOR`       | List all users                   |
| GET    | `/users/:id`       | `ADMINISTRATOR`       | View a specific user             |

Quick demo (service running on `:3001`):

```bash
# log in → capture the token (run as ONE line)
TOKEN=$(curl -sX POST localhost:3001/users/login -H 'Content-Type: application/json' -d '{"email":"you@u.nus.edu","password":"YourPassw0rd!"}' | sed 's/.*"token":"//;s/".*//')

curl -i localhost:3001/users/me                              # no token   → 401
curl -i localhost:3001/users/me -H "Authorization: Bearer $TOKEN"   # valid   → 200
curl -i localhost:3001/users    -H "Authorization: Bearer $TOKEN"   # USER    → 403 (admin only)
```

Responses only ever include public fields — `passwordHash` is never returned.
(To get an admin, promote a user's `roles` to `["ADMINISTRATOR"]` via
`npx prisma studio`, then log in again.)

---

## Integrating with this service (other services)

Other FoC services (e.g. Supplier) authorize requests by **verifying the JWT this
service issues** — locally, with no network call back to user-service. That works
because the token is signed with our private key and anyone can verify it with our
public key.

**What you need from us:**

1. **The public key** — `keys/public.pem`. We sign with the private key (never
   shared); you verify with the public key (safe to share). Ask the user-service
   team for the current `public.pem`. *(Future: fetch it from a JWKS endpoint.)*
2. **The token contract:**
   - Algorithm: **RS256** (always pin it on verify)
   - Header: `Authorization: Bearer <token>`
   - Claims: `sub` = user id (string), `roles` = array of `"USER" | "ADMINISTRATOR"`

**Verify snippet (Express + `jsonwebtoken`):**

```ts
import jwt from 'jsonwebtoken';
import fs from 'node:fs';

const PUBLIC_KEY = fs.readFileSync(process.env.USER_SERVICE_PUBLIC_KEY_PATH!, 'utf8');

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), PUBLIC_KEY, { algorithms: ['RS256'] }); // pin RS256
    req.user = { id: payload.sub, roles: payload.roles };                                // same contract
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export const requireRole = (...allowed: string[]) => (req, res, next) =>
  req.user?.roles?.some((r: string) => allowed.includes(r))
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
```

Apply it where a route needs protection:

```ts
router.post('/supplier', authenticate, requireRole('ADMINISTRATOR'), createSupplier);
```

**Test end to end** (user-service on `:3001`, your service on e.g. `:3002`):

```bash
TOKEN=$(curl -sX POST localhost:3001/users/login -H 'Content-Type: application/json' -d '{"email":"...","password":"..."}' | sed 's/.*"token":"//;s/".*//')
curl -i -X POST localhost:3002/supplier -H "Authorization: Bearer $TOKEN"   # 401 none / 403 USER / 200 ADMIN
```

> **End-state:** once a second service consumes this, the verify logic + contract
> types should move into a shared `@foc/auth` workspace package (single source of
> truth, no drift). For now, copy the snippet above.

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
| `npm run keys:generate`   | Generate the RS256 JWT keypair into `keys/`   |
| `npm run build`           | `prisma generate` + compile TypeScript        |
| `npm start`               | Run the compiled build (`dist/`)              |
| `npm run prisma:migrate`  | Create & apply a migration (`migrate dev`)    |
| `npm run prisma:generate` | Regenerate the Prisma client                  |
| `npm run format`          | Format code with Prettier                     |

## Environment variables

Copy `.env.example` → `.env`. `.env` is gitignored — never commit real secrets.

| Variable       | Purpose                          | Default (local)     |
| -------------- | -------------------------------- | ------------------- |
| `DATABASE_URL`         | Postgres connection string           | see `.env.example`   |
| `PORT`                 | REST (Express) port                  | `3001`               |
| `GRPC_PORT`            | gRPC port (internal profile RPC)     | `50052`              |
| `JWT_PRIVATE_KEY_PATH` | RS256 private key (signs tokens)     | `./keys/private.pem` |
| `JWT_PUBLIC_KEY_PATH`  | RS256 public key (verifies tokens)   | `./keys/public.pem`  |
| `JWT_EXPIRES_IN`       | Access-token lifetime                | `15m`                |

## Architecture

The HTTP API is layered so each file has one job. A request flows through the
layers top to bottom:

```text
Request → routes → middleware → controller → service → Prisma → Postgres
          (which    (validate    (HTTP glue:  (business  (data
           handler)   input,       call         logic)     access)
                      400 if bad)  service,
                                   shape reply)
```

- **routes** — map a URL to a handler. No logic.
- **middleware** — runs before the controller (e.g. validate the body against a
  DTO schema; reject with `400` if invalid).
- **dto** — zod schemas defining valid API input/output shapes (kept separate
  from the Prisma DB model, so internal fields like `passwordHash` never leak).
- **controller** — thin HTTP layer: read the validated request, call a service,
  translate the result into a response + status code.
- **service** — the business logic (uniqueness checks, hashing, create). It has
  no knowledge of HTTP, so it can be reused (e.g. by the gRPC handler later).

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
│   ├── api/               # HTTP (REST) transport
│   │   ├── app.ts         #   Express app + /health, mounts routers
│   │   ├── routes/        #   path → handler wiring
│   │   ├── controllers/   #   HTTP glue (read request, call service, send response)
│   │   ├── services/      #   business logic (uniqueness, hashing, DB via Prisma)
│   │   ├── middleware/    #   cross-cutting (e.g. zod validation)
│   │   └── dto/           #   zod schemas: API input/output shapes
│   └── grpc/server.ts     # gRPC transport
├── compose.yaml           # this service's Postgres (+ service)
└── Dockerfile
```
