# Local setup quickstart

Requires Docker Desktop. Nothing else needs to be installed: the database and the
service both run in containers. 

PLEASE NOTE: This is only for local setup. Check that you do not have the production .env file!!!!

```bash
cd supplier-service
docker compose up -d --build
```

This starts two containers:

| Service | What it is | Where |
| --- | --- | --- |
| `db` | Supabase Postgres 17, seeded | `127.0.0.1:54332` |
| `app` | Express supplier service | `http://localhost:3001` |

On its **first** start the `db` container applies everything in
`supabase/migrations/` in timestamp order and then loads
`supabase/schemas/seed.sql`, which inserts three sample suppliers (one of them
soft-deleted, so it is excluded from list responses).

Check it is up:

```bash
curl localhost:3001/suppliers
```

### Reseeding

Init scripts only run when the data volume is empty, so a plain restart will not
reload the seed. Wipe the volume to start clean:

```bash
docker compose down -v
docker compose up -d --build
```

After changing anything in `src/`, rebuild the app image:

```bash
docker compose up -d --build app
```

### Inspecting the database

```bash
docker compose exec db psql -U postgres -d postgres -c 'select id, "Name" from public."Supplier_Database";'
```

### Stopping

```bash
docker compose down      # keep the data
docker compose down -v   # also delete the data
```

# TODO: Docker CI, Supabase Tests

`vitest` covers the controller and router with the repository mocked, so tests do
not need a database:

```bash
yarn test
```

Test plan
* Include error response tests
* Vitest mocks for each API endpoint
* Concurrency test
*Scalability testing with autocannon package

# Implementation Details

Tech Stack = Express.js, Node, Supabase, Drizzle, JWT(in-progress)

## Database Connection

`src/database/db.ts` builds a single `pg` pool from `DATABASE_URL`. For the
production database, set that variable; for local work the default above applies.

TODO: Set up docker secrets for seamless deployment across different devices

## CRUD Database Operations

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/suppliers` | active suppliers only |
| GET | `/suppliers/search?q=coffee` | full-text search over name, building, description |
| GET | `/suppliers/category?type=food` | filter by category |
| GET | `/supplier/:id` | 404 if missing or soft-deleted |
| POST | `/supplier` | 201 on success, 409 if the name is already taken |
| PUT | `/supplier/:id` | requires `expectedUpdatedAt`, 409 if changed meanwhile |
| DELETE | `/supplier/:id` | soft delete, 404 if already deleted |

`PUT` uses optimistic concurrency. Read the supplier first and send back the
`updatedAt` you received:

For your own reference you can run the docker and then try out these commands from the terminal

```bash
curl -X PUT localhost:3001/supplier/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"New Name","expectedUpdatedAt":"2026-01-01T00:00:00.000Z"}'

curl -X POST localhost:3001/supplier -H 'Content-Type: application/json' \
  -d '{"name":"My Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000"}'

curl localhost:3001/suppliers
curl "localhost:3001/suppliers/search?q=coffee"
curl "localhost:3001/suppliers/search?q=print"
curl "localhost:3001/suppliers/category?type=printing"
curl localhost:3001/supplier/1

curl -X DELETE localhost:3001/supplier/1
```

If someone else updated the row in between, the response is `409` and nothing is
written.

### Error responses

All failures return JSON `{ "message": ... }`. Validation failures also include
`errors`. Status codes come from `src/middleware/errors.ts`: `400` validation,
`401` unauthorized, `404` not found, `409` conflict, `429` rate limited, and
`500` for anything unexpected (details are logged server-side only).

** Very nicely written by Claude. edited by @sunpterodactyl
