# Local setup quickstart

Requires Docker Desktop. Nothing else needs to be installed: the database and the
service both run in containers. 

PLEASE NOTE: This is only for local setup. Check that you do not have the production .env file!!!!

```bash
cd supplier-service
docker compose up -d --build
```

This starts two containers:


| Service | What it is                              | Where                   |
| ------- | --------------------------------------- | ----------------------- |
| `db`    | Supabase Postgres 17, seeded at default | `127.0.0.1:54332`       |
| `app`   | Express supplier service default at     | `http://localhost:3001` |


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



# Testing

Tests do not use the Compose stack above. `yarn test` starts its own throwaway
Supabase Postgres through Testcontainers, applies the same migrations and
`supabase/schemas/seed.sql` that `compose.yaml` mounts, and stops the container
when the run finishes. You do not run `docker compose` for this.

Docker Desktop has to be running, because Testcontainers talks to the Docker
daemon. From `supplier-service/`:

```bash
yarn install
yarn test
```

`yarn test` runs `tests/api`. The first run pulls
`public.ecr.aws/supabase/postgres:17.6.1.167`, which can take a couple of
minutes; later runs reuse the image. The container gets a random host port, so
it never collides with the Compose database on `54332`.

The scalability run is separate, because it measures throughput rather than
correctness and takes about ten seconds:

```bash
yarn test:perf
```

That starts the Express app on a free port and drives `GET /suppliers` and
`GET /suppliers/search` with autocannon against the same Testcontainers database.

# Implementation Details

Tech Stack = Express.js, Node, Supabase, Drizzle, JWT(in-progress)

## Database Connection

`src/database/db.ts` builds a single `pg` pool from `DATABASE_URL`. For the
production database, set that variable; for local work the default above applies.

TODO: Set up docker secrets for seamless deployment across different devices

## CRUD Database Operations


| Method | Route                           | Notes                                                                                            |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/suppliers`                    | public; active suppliers only                                                                    |
| GET    | `/suppliers/search?q=coffee`    | public; full-text search over name, building, description                                        |
| GET    | `/suppliers/category?type=food` | public; filter by category                                                                       |
| GET    | `/supplier/:id`                 | public; 404 if missing or soft-deleted                                                           |
| POST   | `/supplier`                     | Bearer JWT required; 201 on success, 409 if the name is already taken                            |
| PUT    | `/supplier/:id`                 | Bearer JWT required; send `expectedUpdatedAt`; 409 if the row changed, 404 if missing or deleted |
| DELETE | `/supplier/:id`                 | Bearer JWT required; soft delete, 404 if already deleted                                         |


`PUT` uses optimistic concurrency. Read the supplier first and send back the
`updatedAt` you received. The seed sets that to `2026-01-01T00:00:00.000Z`; any
other value is a `409` and nothing is written.

To start run `docker compose up -d --build` and the app should run on port `3001`.
All seed data (3) are specified in `supplier-service/supabase/schemas/seed.sql`.

Write routes need an RS256 Bearer token signed with `keys/private.pem`. From
`supplier-service/` (after `yarn install`):

```bash
TOKEN=$(node --input-type=module -e "
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
const token = jwt.sign({}, fs.readFileSync('./keys/private.pem', 'utf8'), {
  algorithm: 'RS256',
  subject: 'demo-admin',
  expiresIn: '15m',
});
process.stdout.write(token);
")
```


| API endpoint                            | Sample curl command                                                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /suppliers`                        | `curl localhost:3001/suppliers`                                                                                                                                                                                                                              |
| `GET /suppliers/search?q=coffee`        | `curl "localhost:3001/suppliers/search?q=coffee"`                                                                                                                                                                                                            |
| `GET /suppliers/category?type=printing` | `curl "localhost:3001/suppliers/category?type=printing"`                                                                                                                                                                                                     |
| `GET /supplier/:id`                     | `curl localhost:3001/supplier/1`                                                                                                                                                                                                                             |
| `POST /supplier`                        | `curl -X POST localhost:3001/supplier -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"My Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000"}'` |
| `PUT /supplier/:id`                     | `curl -X PUT localhost:3001/supplier/1 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"buildingName":"COM2","expectedUpdatedAt":"2026-01-01T00:00:00.000Z"}'`                                                                    |
| `DELETE /supplier/:id`                  | `curl -X DELETE localhost:3001/supplier/1 -H "Authorization: Bearer $TOKEN"`                                                                                                                                                                                 |


If someone else updated the row in between, the response is `409` and nothing is written. This is done by `updated_at` versioning. If `expectedUpdatedAt` doesn't match the current row, the response is 409.

e.g. run the `PUT` sample above twice; the second command will fail with `409 Conflict`.

To prevent duplicate suppliers, run the `POST` sample twice; the second try will fail with `409`.

A typical caller with no token is just curl without `-H Authorization`. Reads still work. Writes stop at `authenticate` with 401:

```bash
curl -X POST localhost:3001/supplier \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000"}'

curl -X PUT localhost:3001/supplier/1 \
  -H 'Content-Type: application/json' \
  -d '{"buildingName":"COM2","expectedUpdatedAt":"2026-01-01T00:00:00.000Z"}'

curl -X DELETE localhost:3001/supplier/1
```

Expected: GETs `200`, POST/PUT/DELETE `401 Unauthorized`. 

### Error responses

All failures return JSON `{ "message": ... }`. Validation failures also include
`errors`. Status codes come from `src/middleware/errors.ts`: `400` validation,
`401` unauthorized, `404` not found, `409` conflict, `429` rate limited, and
`500` for anything unexpected (details are logged server-side only).

** Very nicely written by Claude. edited by @sunpterodactyl