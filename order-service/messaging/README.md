<!-- AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
Scope: Document the implemented Order User-event subscription; review pending; see ../usage-log.md. -->
# Order User-event subscription

Order uses `@foc/messaging`'s existing RabbitMQClient and the durable
`QUEUES.orderUser` queue, `order.user-events`. The compiled handler is
`../grpc/src/events/userDeleted.ts`.

Set `RABBITMQ_URL` to enable subscription. The lifecycle Compose override defaults
to `amqp://guest:guest@host.docker.internal:5672`; the host-development example
uses `amqp://guest:guest@localhost:5672`. Start RabbitMQ before Order. If the
configured broker cannot be reached on initial startup, Order startup fails
rather than silently pretending to subscribe. Once connected, shared-client
reconnection restores registered consumers. If the URL is omitted, subscription
is disabled and startup logs that fact.

User's existing outbox publisher sends **directly to queues**. The User owner
must publish a copy of `user.deleted` to `order.user-events`; sending only to
`credit.user-events` will not reach Order. This consumer does not set up an
exchange binding or call the broader shared `setupTopology` helper. No User
publisher or deletion endpoint was changed by this work.

Payload (no `purgeAfter` required):

```json
{
  "type": "user.deleted",
  "eventId": "unique-event-id",
  "occurredAt": "2026-11-02T00:00:00.000Z",
  "userId": "old-user-id",
  "deletedAt": "2026-11-02T00:00:00.000Z"
}
```

IDs must be nonblank and timestamps must be offset-bearing ISO datetimes.
If RabbitMQ messageId is supplied, it must match payload.eventId. Valid events
are recorded in PostgreSQL's `UserDeletionEvent` table **before ACK**. The primary
key prevents duplicate receipts, including concurrent delivery or restart after
commit. Reuse of an event ID with different user/timestamps is rejected.
Only IDs and timestamps are stored. Repeated created/restored events are ignored;
old orders are never assigned to a restored user's new ID.

Invalid/unknown events and conflicting event IDs go to `order.user-events.dlq`.
Database failures follow the shared client's three retry deliveries before
being dead-lettered. They are not acknowledged as successful receipts. A broker
ACK loss after database commit is safe because re-delivery checks the saved ID.
Order closes its broker connection during graceful shutdown.

## Scope

This implements **subscription and durable receipt only**. A receipt does not
mean deletion lifecycle work is complete. History scrubbing, old-token rejection
from local deletion markers, processing pending creations/edits, the eligibility
RPC and Order-to-User conflict notification are separate work. Existing active
orders and credits are left unchanged. The team has said to keep raced active
orders for completion and notify User; no notification payload/queue/RPC has yet
been confirmed.

## Run and verify

From the repository root, with the configured Credit token:

```sh
docker compose -f shared/messaging/compose.yaml up -d --wait
docker compose -f order-service/compose.yaml -f order-service/compose.lifecycle.yaml up --build -d --wait
docker compose -f order-service/compose.yaml logs --tail=50 order-service
```

Startup should log `Order user.deleted subscription ready` and
`queue: 'order.user-events'`. Order applies migration
`20261102010000_user_deletion_event_receipts` automatically in Docker. For host
startup, apply migrations with `npm run prisma:deploy --workspace @foc/order-grpc`
and set RABBITMQ_URL before `npm run dev --workspace @foc/order-grpc`.

Read-only inspection:

```sh
docker compose -f order-service/compose.yaml exec postgres \
  psql -U order_service -d order_service \
  -c 'SELECT "eventId", "userId", "deletedAt", "receivedAt" FROM "UserDeletionEvent" ORDER BY "receivedAt" DESC LIMIT 20;'
docker exec local-rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

For automated live-broker tests, use a **disposable** broker on
127.0.0.1:5679 and a dedicated `order_service_test*` database with migrations
applied. Do not point tests at the demo broker/database.

```sh
TEST_DATABASE_URL=postgresql://order_service:order_service@127.0.0.1:55450/order_service_test_events \
TEST_RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5679 \
npm run test:integration --workspace @foc/order-grpc
```

Without TEST_RABBITMQ_URL the broker integration test is skipped. Unit tests
still cover malformed messages and propagation of database failures.
