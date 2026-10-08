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


| Method | Route                                   | Notes                                                                                            |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/suppliers`                            | public; active suppliers only                                                                    |
| GET    | `/suppliers/search?q=coffee`            | public; full-text search over name, building, description                                        |
| GET    | `/suppliers/category?type=food`         | public; filter by category                                                                       |
| GET    | `/supplier/:id`                         | public; 404 if missing or soft-deleted                                                           |
| POST   | `/supplier`                             | Bearer JWT required; 201 on success, 409 if the name is already taken                            |
| PUT    | `/supplier/:id`                         | Bearer JWT required; send `expectedUpdatedAt`; 409 if the row changed, 404 if missing or deleted |
| DELETE | `/supplier/:id`                         | Bearer JWT required; soft delete, 404 if already deleted                                         |
| PUT    | `/supplier/:id/openingHours/:dayOfWeek` | Bearer JWT required; replaces one day of opening hours                                           |


`PUT /supplier/:id` uses optimistic concurrency. Read the supplier first and send back the
`updatedAt` you received. The seed sets that to `2026-01-01T00:00:00.000Z`; any
other value is a `409` and nothing is written.

To start run `docker compose up -d --build` and the app should run on port `3001`.
All seed data (3) are specified in `supplier-service/supabase/schemas/seed.sql`.

Write routes need an RS256 Bearer token signed with `keys/private.pem`. The user
service puts `roles` on the token as an **array** (`USER` or `ADMINISTRATOR`),
not a single `role` string. From `supplier-service/` (after `yarn install`):

```bash
# User token
TOKEN=$(node --input-type=module -e "
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
const token = jwt.sign(
  { roles: ['USER'] },
  fs.readFileSync('./keys/private.pem', 'utf8'),
  { algorithm: 'RS256', subject: 'demo-user', expiresIn: '15m' },
);
process.stdout.write(token);
")

# Admin token (use this for the write curls below)
TOKEN=$(node --input-type=module -e "
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
const token = jwt.sign(
  { roles: ['ADMIN'] },
  fs.readFileSync('./keys/private.pem', 'utf8'),
  { algorithm: 'RS256', subject: 'demo-admin', expiresIn: '15m' },
);
process.stdout.write(token);
")
```


| API endpoint                                | Sample curl command                                                                                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /suppliers`                            | `curl localhost:3001/suppliers`                                                                                                                                                                 |
| `GET /suppliers/search?q=coffee`            | `curl "localhost:3001/suppliers/search?q=coffee"`                                                                                                                                               |
| `GET /suppliers/search-radius`              | `curl "localhost:3001/suppliers/search-radius?latitude=1.294167&longitude=103.773611&radius=500"`                                                                                                |
| `GET /suppliers/category?type=printing`     | `curl "localhost:3001/suppliers/category?type=printing"`                                                                                                                                        |
| `GET /supplier/:id`                         | `curl localhost:3001/supplier/1`                                                                                                                                                                |
| `POST /supplier`                            | see the multi-line sample below; the body needs all seven days of `openingHours`                                                                                                                |
| `PUT /supplier/:id`                         | `curl -X PUT localhost:3001/supplier/1 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"buildingName":"COM2","expectedUpdatedAt":"2026-01-01T00:00:00.000Z"}'`       |
| `DELETE /supplier/:id`                      | `curl -X DELETE localhost:3001/supplier/1 -H "Authorization: Bearer $TOKEN"`                                                                                                                    |
| `PUT /supplier/:id/openingHours/:dayOfWeek` | `curl -X PUT localhost:3001/supplier/1/openingHours/1 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"opensAt":"08:30:00","closesAt":"18:00:00","isClosed":false}'` |




## Creating a supplier

`POST /supplier` is atomic: the supplier row and its seven opening-hours rows are
written in one transaction. `createSupplierSchema` rejects the request with `400`
unless `openingHours` has exactly seven entries with `dayOfWeek` 0 through 6, each
appearing once.

```bash
curl -X POST localhost:3001/supplier \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Cafe",
    "type": "food",
    "buildingName": "COM1",
    "locationDescription": "L1",
    "floor": 1,
    "latitude": "1.290000",
    "longitude": "103.770000",
    "openingHours": [
      { "dayOfWeek": 0, "isClosed": true,  "opensAt": null,      "closesAt": null },
      { "dayOfWeek": 1, "isClosed": false, "opensAt": "09:00:00", "closesAt": "17:00:00" },
      { "dayOfWeek": 2, "isClosed": false, "opensAt": "09:00:00", "closesAt": "17:00:00" },
      { "dayOfWeek": 3, "isClosed": false, "opensAt": "09:00:00", "closesAt": "17:00:00" },
      { "dayOfWeek": 4, "isClosed": false, "opensAt": "09:00:00", "closesAt": "17:00:00" },
      { "dayOfWeek": 5, "isClosed": false, "opensAt": "09:00:00", "closesAt": "17:00:00" },
      { "dayOfWeek": 6, "isClosed": true,  "opensAt": null,      "closesAt": null }
    ]
  }'
```



### Failure cases worth trying

All four return `400` and write nothing. The first three are caught by
`createSupplierSchema` before any query runs:

```bash
# 400: only six days, "Opening hours must span 7 days of the week"
curl -X POST localhost:3001/supplier -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Six Day Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000","openingHours":[{"dayOfWeek":0,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":1,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":2,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":3,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":4,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":5,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"}]}'

# 400: seven entries but day 1 appears twice and day 2 is missing
curl -X POST localhost:3001/supplier -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Dup Day Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000","openingHours":[{"dayOfWeek":0,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":1,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":1,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":3,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":4,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":5,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":6,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"}]}'

# 400: dayOfWeek 7. The refine() only counts seven distinct days, so the range is
# restated on createOpeningHoursSchema; the error names openingHours.2.dayOfWeek
curl -X POST localhost:3001/supplier -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Day Seven Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000","openingHours":[{"dayOfWeek":0,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":1,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":7,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":3,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":4,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":5,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":6,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"}]}'
```

The fourth is the one zod cannot catch, because it does not cross-check the three
fields against each other. The table's agreement constraint rejects it and
`createSupplierService` maps the violation to `400`, matching what the nested
`PUT` reports for the same mistake:

```bash
curl -X POST localhost:3001/supplier -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Disagree Cafe","type":"food","buildingName":"COM1","locationDescription":"L1","floor":1,"latitude":"1.290000","longitude":"103.770000","openingHours":[{"dayOfWeek":0,"isClosed":true,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":1,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":2,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":3,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":4,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":5,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"},{"dayOfWeek":6,"isClosed":false,"opensAt":"09:00:00","closesAt":"17:00:00"}]}'
```

Running the valid sample above a second time is a `409`: the name is taken and
`unique_active_supplier_name` rejects the insert.

## Updating opening hours

Hours live in `public.supplier_opening_hours`, one row per supplier per day, so
they are edited through a nested route instead of resending the whole supplier.
`dayOfWeek` is in the path and follows Postgres' convention: **0 is Sunday**
through 6 for Saturday.

A day is replaced, not patched. `opensAt`, `closesAt` and `isClosed` are all
required because the table's check constraint needs them to agree: either
`isClosed` is true and both times are `null`, or `isClosed` is false and both
times are set. Times are `HH:MM:SS` without a timezone.

```bash
# Monday 08:30 to 18:00
curl -X PUT localhost:3001/supplier/1/openingHours/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":"08:30:00","closesAt":"18:00:00","isClosed":false}'

# closed on Sunday
curl -X PUT localhost:3001/supplier/1/openingHours/0 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":null,"closesAt":null,"isClosed":true}'
```

There is no `expectedUpdatedAt` here: a day is small enough that last write wins
is acceptable, and `updated_at` is maintained by the
`supplier_opening_hours_set_updated_at` trigger rather than the application.

Failure cases worth trying:

```bash
# 400: isClosed disagrees with the times
curl -X PUT localhost:3001/supplier/1/openingHours/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":"09:00:00","closesAt":"17:00:00","isClosed":true}'

# 400: dayOfWeek outside 0-6
curl -X PUT localhost:3001/supplier/1/openingHours/9 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":"09:00:00","closesAt":"17:00:00","isClosed":false}'

# 404: supplier 3 is soft deleted in the seed
curl -X PUT localhost:3001/supplier/3/openingHours/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":"09:00:00","closesAt":"17:00:00","isClosed":false}'

# 401: no token
curl -X PUT localhost:3001/supplier/1/openingHours/1 \
  -H 'Content-Type: application/json' \
  -d '{"opensAt":"09:00:00","closesAt":"17:00:00","isClosed":false}'
```

Inspect the result straight from the database:

```bash
docker compose exec db psql -U postgres -d postgres \
  -c 'select day_of_week, opens_at, closes_at, is_closed from public.supplier_opening_hours where supplier_id = 1 order by day_of_week;'
```



## Conflicts on the supplier row 

If someone else updated the row in between, the response is `409` and nothing is written. This is done by `updated_at` versioning. If `expectedUpdatedAt` doesn't match the current row, the response is 409.

e.g. run the `PUT /supplier/1` sample from the table twice; the second command will fail with `409 Conflict`.

To prevent duplicate suppliers, run the `POST` sample twice; the second try will fail with `409`.

A typical caller with no token is just curl without `-H Authorization`. Reads still work. Writes stop at `authenticate` with 401:

```bash
# authenticate runs before validateRequest, so this 401s on the token alone and
# the body is deliberately short: no openingHours needed to see the rejection
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