import { randomUUID } from 'node:crypto';
import { Metadata } from '@grpc/grpc-js';
import { createCreditClient } from '@foc/grpc';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../grpc/.env', import.meta.url)), quiet: true });
if (!process.env.CREDIT_SERVICE_TOKEN) throw new Error('CREDIT_SERVICE_TOKEN is required');
const client = createCreditClient(process.env.CREDIT_GRPC_ADDR ?? '127.0.0.1:50053');
const metadata = new Metadata();
metadata.set('x-credit-service-token', process.env.CREDIT_SERVICE_TOKEN);
const options = { metadata };
const requesterId = randomUUID();
const courierId = randomUUID();
const orderId = randomUUID();
try {
  await client.initCredits({ userId: requesterId }, options);
  await client.initCredits({ userId: courierId }, options);
  const reservation = await client.reserveCredits({ orderId, requesterId, amount: 4 }, options);
  await client.updateReservation({ orderId, amount: 3, expectedVersion: reservation.version, idempotencyKey: randomUUID() }, options);
  const settled = await client.settleCredits({ orderId, courierId }, options);
  console.log('Reservation:', settled);
  console.log('Requester:', await client.getBalance({ userId: requesterId }, options));
  console.log('Courier:', await client.getBalance({ userId: courierId }, options));
} finally {
  client.close();
}
