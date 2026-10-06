# CampusDash UI

React and TypeScript app built with Vite 8 and Tailwind CSS 4.

## Run locally

From this directory:

```sh
nvm use
npm ci
npm run dev
```

If you do not use nvm, use Node.js 20.19+ or 22.12+ as required by Vite.
The `.nvmrc` selects Node.js 22.22.0. Check `node --version` if startup
fails with a `node:util` / `styleText` error.

## Checks

```sh
npx tsc --noEmit
npm run build
```

Tailwind is compiled by `@tailwindcss/vite` in `vite.config.ts`.
`main.tsx` imports `index.css`, which imports Tailwind and defines the theme.
Restart the dev server after changing the Vite configuration.

## Live User and Supplier APIs

This checkout includes User Service code from `F2-auth-jwt-rbac` and Supplier
Service code from `origin/init-supplier-database`. Supplier mutations additionally
require the `ADMINISTRATOR` JWT role.

Run commands in separate terminals. From the repository root, generate the User
Service key pair **only if it does not already exist**:

```sh
mkdir -p user-service/keys
# Skip both commands when an existing pair is present; do not replace active keys.
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out user-service/keys/private.pem
openssl pkey -in user-service/keys/private.pem -pubout -out user-service/keys/public.pem
```

The Supplier Service must use this same public key, never the private key.
Keys and `.env` files are ignored by Git. Private keys must never enter `VITE_*`
variables or browser code.

### Docker setup

With Docker Desktop running, from the repository root:

```sh
docker compose -f user-service/compose.yaml up --build -d
docker compose -f supplier-service/compose.yaml up --build -d
```

The User API is exposed on port 3001 and the Supplier API on port 3002. Each
service owns a separate database. The supplier stack initializes its existing
migrations only on a fresh database volume. No database migration was changed
by this integration.

Alternatively, run the services on the host using their existing README setup:
copy each service's `.env.example` to `.env` if absent, install its dependencies
(User: `npm ci`; Supplier: `corepack yarn install --frozen-lockfile`), prepare its
database, then run `npm run dev` in each service folder. Supplier `.env.example`
selects port 3002 and the shared User Service public key.

### Frontend

From `ui/`:

```sh
nvm use
# Copy only if you do not already have a local configuration:
cp .env.example .env
npm ci
npm run dev
```

The Vite development proxy forwards `/api/users/*` and `/api/suppliers/*` to the
configured `USER_SERVICE_URL` and `SUPPLIER_SERVICE_URL`, stripping the proxy
prefix. For example, `/api/users/users/login` reaches `/users/login`.
In production, configure your host/reverse proxy with those same mappings;
Vite's development proxy is not included in the production build. If you use
cross-origin public API URLs instead, the backend must separately allow the
frontend origin via CORS. This change does not add permissive backend CORS.

### Authentication and roles

Register with a valid NUS email, username, first/last name, and a password meeting
the displayed requirements. Registration does not issue a token; sign in after
registration. Login obtains the existing RS256 JWT and `/users/me` retrieves the
profile and roles. Tokens use session storage by default; Remember me uses local
storage. Logout clears both stores. There is no refresh-token or server logout
endpoint; an expired session requires signing in again.

New accounts have `USER` privileges. Use an administrator account provisioned by
the team through its existing process to see the Admin navigation item and manage
suppliers. There is no role-granting UI. Backend authorization remains authoritative:
reads are public; POST/PUT/DELETE require a valid token with `ADMINISTRATOR`.

### Connected workflows and limits

- Login, registration, current profile, and admin user listing use User REST APIs.
- Supplier browse/details, request pickup selection, and admin CRUD use live data.
- Search uses `/suppliers/search?q=...`; category filtering uses
  `/suppliers/category?type=...`. When both controls are selected, search runs on
  the server and category filtering is applied to its full result set.
- Edits send the fetched `updatedAt` as `expectedUpdatedAt`; a conflict leaves the
  form open with an option to reload. No automatic overwriting occurs.
- No sorting/pagination APIs exist; the current UI intentionally retrieves the
  complete list or search result without introducing new backend contracts.
- Order, credit and activity-log services are absent. Their existing screens remain
  prototypes and are labelled as such. No real credit balance or statistics are
  returned by User Service; the profile adapter starts authenticated users with 10 prototype credits and zero activity statistics. This balance is not persisted and resets when the profile is loaded again. Profile
  editing, password recovery, server logout and role administration have no
  implemented endpoints and are not connected.

### Verification

```sh
# ui/
npm test
npx tsc --noEmit
npm run build
# user-service/
npm run build
# supplier-service/
npm run test:auth  # temporary HTTP server, no database
npx tsc --noEmit
npm test          # disposable Docker database, applies existing migrations
```

The frontend tests stub HTTP responses to check contracts, token handling,
search/filter normalization, mutations, validation messages, and conflicts. They
do not establish live database persistence. Supplier authorization tests use the
real router/JWT validation with mocked controllers; database tests are separate.

## Supplier verification (2 October 2026)

Search and category endpoints now return the same camelCase fields as the
list/detail endpoints. The SQL search/filter functions and database schema are
unchanged; the repository aliases their results.

Supplier cards and detail dialogs display images. CSV GitHub links to the six
checked-in `data/images/*.jpeg` files resolve to bundled local assets in both
development and production. Other HTTP(S) image URLs are supported, and missing
or failed images display a placeholder. Images load lazily.

Verified against the running local services: administrator login, supplier
creation, edit, and deletion through the browser, with a full page refresh after
each mutation; live supplier search; CSV photo loading; and supplier card/form
layouts at 390px and 1280px widths. The temporary QA account was removed after
verification, and its supplier was deleted through the UI.

Checks passed: 51 database API tests, 16 authorization tests, 8 frontend tests,
frontend production build, and frontend/Supplier TypeScript checks. The existing
14 backend TODO tests remain unimplemented.

## Replacing the Supplier Service

See [Supplier Service handoff](../docs/supplier-service-handoff.md) for the teammate's weekly-hours API, configuration switch, port/JWT requirements, database migration concerns, and contracts that still need confirmation from her PR. Keep `VITE_SUPPLIER_HOURS_MODE=legacy` until that service is installed; then use `weekly` and restart Vite.
