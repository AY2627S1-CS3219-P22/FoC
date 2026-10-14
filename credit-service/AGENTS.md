# Credit Service

Use `docs/class-diagram.md` as the design reference for implementation in this service.
It records the team's class diagram, implemented components, pending methods, and
mappings required by existing repository contracts.
Use `docs/requirements.md` for the supplied FR/NFR mappings, integration responsibilities,
and unresolved policy questions alongside the class diagram.

Follow the controller → service → repository responsibilities. Persist credit
changes, history, and idempotency results through one SQL transaction. Preserve
existing gRPC names/response fields, and document any required diagram deviations.

All credit RPCs require caller-scoped credentials, including local development.
Preserve user ownership/admin JWT checks and default-deny access. Returning-account
restoration replaces starter credits; it must not grant another 10 credits.
Dispute management is outside the agreed scope. Retry identities are derived by
Credit Service from the user/order ID and, for updates, the expected reservation version.
See the requirements reference for confirmed policies.
Archived-user work (archive storage, archive/restore operations, retention and
their User Service integration) is deferred at the user's request until User Service
implements its account-deletion/archive lifecycle. Keep the confirmed restore rule
documented for that later work.
