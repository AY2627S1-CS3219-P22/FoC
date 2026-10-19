# Order race-policy integration

`grpc/src/services/order-race-policy.ts` implements a tested policy component for
F6.3.3–F6.3.4, F6.4.3 and F7.2.4. The current branch and refreshed
`origin/order-setup` have only a `GetOrder` gRPC scaffold. This component is not yet
wired into order endpoints, an order database or a durable queue.

## Meaning of concurrent

A competing cohort consists of pending intents submitted before its state transition
is initiated under the Order Service's order lock. All eligible commands in that cohort
are compared together, independent of their order in the input list.
Once a transition is committed, a later request is validated against that new state;
priority does not undo a committed acceptance or terminal transition.

For an open errand, the priority is expiry, cancellation, acceptance, then edit.
Thus cancellation/expiry defeats acceptance, and acceptance defeats edit. Among
equally ranked valid commands, server-recorded submission time followed by command ID
provides deterministic selection; only one courier can win. Do not accept client-supplied
timestamps as the ordering authority. Requesters cannot accept their own errands,
and only the requester can edit/cancel.

Once an edit wins, persist `EDITING` before calling Credit Service. Acceptance is
blocked while that update is in progress. Re-open the order only after reconciling
the credit result and incrementing its version. Other actions that arrive during
`EDITING` should remain pending/retry until the update finishes; do not launch a
release concurrently with the unfinished update.

At or after the expiry timestamp, an open order cannot be accepted or edited, even
if the expiry scheduler is late. The policy returns a stable synthetic expiry intent
when needed. Already accepted orders and delivery-deadline timeout handling are a
separate lifecycle flow; this component does not implement F8.6.3's scheduler.

## Required integration steps

1. Authenticate the user and derive their actor ID on the backend. Use persisted
   order state, version and expiry, and a server clock; never trust those fields from
   an incoming request body. Only the scheduler/backend may submit expiry intents.
2. Persist intents with a unique command/idempotency ID before dispatch. Requests
   must share a persistent queue/dispatcher across application instances. Do not
   call the policy separately for each competing request: that would restore
   first-request-wins behaviour rather than the specified priority.
3. Lock the order row and load its eligible pending cohort. Call
   `new OrderRacePolicy().decide(snapshot, pending, now)` under that lock.
4. Persist the winning state/version and each command's result atomically with
   required credit work in an outbox/pending-operation record. Use a conditional
   version check so a stale worker cannot overwrite a committed decision. The
   policy's returned cancellation/expiry status is the intended transition; do not
   report a fully reconciled terminal result before required release is confirmed.
5. Make external credit calls outside the database lock. For edits, call one
   `UpdateReservation` RPC with the existing reservation version. For cancellation
   or expiry, call `ReleaseCredits`. Only Credit Service modifies the hold/balance.
   Send only Order Service's scoped credential.
6. Retry/reconcile uncertain credit responses with the original request, including
   the credit reservation's original `expectedVersion` for an edit. Credit derives
   retry identities internally; callers do not supply keys.
   Persist completion before returning success. Return the persisted result for
   duplicate commands; never treat a timeout as a new edit with a newer version.

Test simultaneous intent submission against the actual database, cross-process
workers, restart recovery, dispatcher failure and credit timeouts once these
integration pieces exist. Pure policy tests establish winner selection, not the
end-to-end queue's race window or cross-service consistency.
