import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { credentials, Metadata } from '@grpc/grpc-js';
import { createCreditClient } from '@foc/grpc';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
if (!process.env.CREDIT_USER_SERVICE_TOKEN || !process.env.CREDIT_ORDER_SERVICE_TOKEN) {
  throw new Error('Run npm run security:setup --workspace @foc/credit-grpc before the local demo');
}
// Set CREDIT_GRPC_CA_PATH to the trusted server certificate when the service uses TLS (e.g. the container).
const caPath = process.env.CREDIT_GRPC_CA_PATH;
const client = createCreditClient(process.env.CREDIT_GRPC_ADDR ?? '127.0.0.1:50054',
  caPath ? { credentials: credentials.createSsl(readFileSync(caPath)) } : {});
const userMetadata = new Metadata();
userMetadata.set('x-credit-service-token', process.env.CREDIT_USER_SERVICE_TOKEN);
const orderMetadata = new Metadata();
orderMetadata.set('x-credit-service-token', process.env.CREDIT_ORDER_SERVICE_TOKEN);
const userOptions = { metadata: userMetadata };
const orderOptions = { metadata: orderMetadata };
const requesterId = randomUUID();
const courierId = randomUUID();
const orderId = randomUUID();
try {
  await client.initCredits({ userId: requesterId }, userOptions);
  await client.initCredits({ userId: courierId }, userOptions);
  const reservation = await client.reserveCredits({ orderId, requesterId, amount: 4 }, orderOptions);
  await client.updateReservation({ orderId, amount: 3, expectedVersion: reservation.version }, orderOptions);
  const settled = await client.settleCredits({ orderId, courierId }, orderOptions);
  console.log('Reservation:', settled);
  console.log('Requester:', await client.getBalance({ userId: requesterId }, orderOptions));
  console.log('Courier:', await client.getBalance({ userId: courierId }, orderOptions));
} finally {
  client.close();
}
