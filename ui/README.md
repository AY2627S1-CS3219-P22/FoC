<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22. Order integration setup/testing documentation; author review pending; see ../order-service/usage-log.md. -->
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

## Connected Order UI

This branch includes teammate work from `origin/ui/api-layer` for User login,
registration, profile, refresh-cookie sessions and Supplier access. Order calls
reuse that shared API client and its one-time refresh retry.

Run the real User/Supplier/Credit services and configure Order authentication,
peer RPC addresses and its Credit token as described in
[Order manual integration testing](../order-service/MANUAL_TESTING.md). The base
Order Docker setup supports health checks alone; it needs the documented User
public key/Credit configuration for authenticated lifecycle operations.

Copy `.env.example` to `.env.local` only if overriding service addresses. Restart
Vite after changing proxy settings. Defaults are User 3001, Supplier 3002,
Order 3003 and Credit 3004. If using this chat's alternate Order Docker ports,
set `ORDER_SERVICE_URL=http://localhost:33003` (and still configure backend auth).
`/backend/orders` and `/backend/credits` strip `/backend` before forwarding.
These proxies apply to Vite development; deployed hosting needs the same paths
configured by the team's deployment setup. No service credentials are sent by
the frontend: it sends the User JWT; Order owns the Credit service credential.

Implemented UI connections:

- Open requests use `GET /orders?scope=open`; requester/courier history uses
  `scope=requested` and `scope=assigned`. Details show authorized listing data.
- Create uses real Supplier IDs and `POST /orders`. Supplier loading fails
  visibly; sample catalog entries are never submitted as real suppliers.
- Requester edit uses `PATCH /orders/:id` with original expiry preserved when
  unchanged. Validate expiry at least one hour ahead, nonblank details and credits.
- Accept/cancel/deliver use their implemented backend endpoints. Cancellation
  retains history. Credit balances load through `/credits/me/balance`; an
  unavailable balance displays an em dash rather than a fabricated amount.
- Administrator reads use unscoped `GET /orders`. Administrator deletion and
  requester confirm/release actions have no backend contract and are disabled
  or omitted. Pickup is disabled: this branch has no pickup endpoint.
- Only backend responses update order state. DELIVERED/SETTLEMENT_PENDING is
  displayed as delivered; completed/payment confirmation requires SETTLED.
  CANCELLED with EXPIRY displays expired. Refund-pending orders stay in history.

Creation/edit requests save the body and idempotency key in tab session storage,
scoped to the authenticated user, before sending. A pending/uncertain response
keeps them; “Check / retry original request” sends exactly those saved values.
They survive a reload in the same tab. Creating/editing another request stays
blocked until the saved request resolves. Backend recovery continues without
an open tab. Confirmed validation/permission/business rejection allows correction.
Request controls are disabled while processing. Listings refresh on navigation,
after mutations, manually, and every 15 seconds. Listing errors show a retry
control; no sample orders or local credit deductions are used.

## Integration checks

```sh
npm test
npx tsc --noEmit
npm run build
```

Use the Node version selected by `.nvmrc`. Six API tests cover scopes, JWT headers,
status mapping, 202 preservation, mutation bodies/keys, refresh retry and failures.
Browser verification used an isolated test API, not live peer-service data:
create -> 202 -> reload -> same-key/body retry -> created; accept; edit; cancel
with refund pending/history; disabled pickup; service-unavailable error.

For a live check, log in as requester and courier in separate browser profiles.
Create with a real open supplier and credits, check that only the courier sees it
in open requests, edit before acceptance, accept as courier, and check each user's
My Orders tab. Use a separate unassigned order to check cancellation/history.
A pending credit operation must never show a paid/completed success. Complete
pickup/delivery walkthrough remains blocked until the team supplies pickup.
The existing standalone Suppliers page retains the teammate's labelled sample
fallback; Order creation does not use it.

## AI Use Summary

ChatGPT (Codex), 2026-10-22: implemented Order UI/API connection, pending request
handling, tests and documentation on the team's existing UI API layer. The team
provided the REST contracts, JWT approach and lifecycle rules. Human review
remains pending; exact prompts/key exchanges and verification are in
[Order usage log](../order-service/usage-log.md). Project-wide disclosure is the
last section of the root README.
