## RabbitMQ Broker

Shared `@foc/messaging` workspace. One `RabbitMQClient` plus typed contracts; each microservice only plugs in its own producer/consumer.

### Structure of the folder

```text
shared/messaging/
├── src/
│   ├── contracts/
│   │   ├── credit.ts      # credit command / result payloads
│   │   ├── order.ts       # order event payloads
│   │   └── supplier.ts    # supplier event payloads
│   ├── index.ts           # RabbitMQClient singleton (connect, publish, consume, DLQ)
│   └── topology.ts        # queues, exchanges, retry / DLQ / DLX names
├── compose.yaml           # local RabbitMQ broker — start from here
├── package.json           # @foc/messaging dependencies
├── README.md
└── tsconfig.json
```

### How to define a consumer in your own microservice

Connect once, then `consumeFromQueue<T>` with a contract type. The client asserts the queue + DLQ, acks on success, and retries / dead-letters on failure.

**Credit service** — payment commands:

```ts
import { RabbitMQClient, QUEUES, type CreditCommand } from '@foc/messaging';

const broker = new RabbitMQClient({ queues: [QUEUES.creditPayments] });
await broker.connect();

await broker.consumeFromQueue<CreditCommand>(QUEUES.creditPayments, async (msg) => {
  // msg.payload is CreditCommand (reserve / release / settle)
});
```

**Order service** — supplier cache updates:

```ts
import { RabbitMQClient, QUEUES, type SupplierEvent } from '@foc/messaging';

const broker = new RabbitMQClient({ queues: [QUEUES.orderSupplier] });
await broker.connect();

await broker.consumeFromQueue<SupplierEvent>(QUEUES.orderSupplier, async (msg) => {
  // msg.payload is SupplierUpdated | SupplierStatusChanged | SupplierDeleted
});
```

### How to define a producer in your own microservice

`publishToQueue` JSON-serializes the payload, sets `messageId` from `eventId` (or a UUID), and asserts the queue first so the publisher can start before the consumer.

**Order service** — cancel / refund (credit release):

```ts
import { RabbitMQClient, QUEUES, type CreditReleaseCommand } from '@foc/messaging';

const broker = new RabbitMQClient();
await broker.connect();

const command: CreditReleaseCommand = {
  type: 'payment.release',
  eventId: crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  orderId: 'ord-1',
};

await broker.publishToQueue(QUEUES.creditPayments, command, command.eventId);
```

**Supplier service** — notify order-service of a catalogue change:

```ts
import { RabbitMQClient, QUEUES, type SupplierUpdated } from '@foc/messaging';

const broker = new RabbitMQClient();
await broker.connect();

const event: SupplierUpdated = {
  type: 'supplier.updated',
  eventId: crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  supplierId: '42',
  name: 'Fine Food',
  supplierType: 'canteen',
  buildingName: 'YIH',
  locationDescription: 'Level 1',
  floor: 1,
  latitude: '1.29',
  longitude: '103.77',
};

await broker.publishToQueue(QUEUES.orderSupplier, event, event.eventId);
```

### RabbitMQ Package

`@foc/messaging` is an internal npm workspace (`amqplib`). Build with `npm run build --workspace @foc/messaging`. Default broker URL is `amqp://guest:guest@localhost:5672`.

**Start the broker** from this folder:

```bash
docker compose -f shared/messaging/compose.yaml up -d
```

**Create a client** in a service (connect at startup, close on shutdown):

```ts
import { RabbitMQClient, QUEUES } from '@foc/messaging';

const broker = new RabbitMQClient({
  url: process.env.RABBITMQ_URL,
  serviceName: 'order-service',
  queues: [QUEUES.orderSupplier, QUEUES.orderCredits],
  maxRetries: 3,
});

await broker.connect();
// ... publish / consume ...
await broker.close();
```

**IMPORTANT** - The broker is not yet published as an npm package, and does not yet exist as a single source of truth (on the cloud).

### CLI test for connection

Run these from `shared/messaging/` against the compose broker. There is no automated test suite.

Start (or confirm) the broker first:

```bash
docker compose up -d
```

#### 1. Connection

```bash
docker compose ps
docker exec local-rabbitmq rabbitmq-diagnostics ping
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:15672
```

Expected:

```text
NAME             IMAGE                   COMMAND                  SERVICE    CREATED         STATUS                   PORTS
local-rabbitmq   rabbitmq:3-management   "docker-entrypoint.s…"   rabbitmq   ...             Up ... (healthy)         0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

```text
Will ping rabbit@.... This only checks if the OS process is running and registered with epmd. Timeout: 60000 ms.
Ping succeeded
```

```text
200
```

Management UI: [http://localhost:15672](http://localhost:15672) — user `guest` / password `guest`. AMQP is `amqp://guest:guest@localhost:5672`.

If ping fails or `curl` is not `200`, the container is not healthy yet — wait and retry. `ECONNREFUSED` on `5672` means the AMQP port is not published.

**AI Declaration** — Helped with formatting, and expansion on unclear definitions written by @sunpterodactyl. All thoughts/explanations are my own.
