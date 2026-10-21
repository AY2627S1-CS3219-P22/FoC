// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-22.
// Scope: Generated setup implementation following approved User Service conventions.
// Author review: Pending; see ../../usage-log.md.
import { readFileSync } from 'node:fs';
import { createCreditClient } from './dependencies/creditClient';
import { createDirectories } from './dependencies/directories';
import { createOrderCreation } from './services/orderCreation';
import { createOrderEdits } from './services/orderEdits';
import { createOrderLifecycle } from './services/orderLifecycle';
import { once } from 'node:events';
import { startServer, stopServer } from '@foc/grpc';
import { env } from './env';
import { prisma } from './db';
import { createApp } from './api/app';
import { createGrpcServer } from './grpc/server';

async function main(): Promise<void> {
  await prisma.$connect();
  const grpcServer = createGrpcServer();
  const publicKey = env.USER_SERVICE_PUBLIC_KEY_PATH ? readFileSync(env.USER_SERVICE_PUBLIC_KEY_PATH, 'utf8') : undefined;
  const credit = env.CREDIT_ORDER_SERVICE_TOKEN ? createCreditClient(env.CREDIT_GRPC_ADDR, env.CREDIT_ORDER_SERVICE_TOKEN,
    env.GRPC_TIMEOUT_MS, env.CREDIT_GRPC_CA_PATH ? readFileSync(env.CREDIT_GRPC_CA_PATH) : undefined) : undefined;
  const directories = createDirectories(env.USER_GRPC_ADDR, env.SUPPLIER_GRPC_ADDR, env.GRPC_TIMEOUT_MS);
  const creation = credit ? createOrderCreation(prisma, credit, directories) : undefined;
  const edits = credit ? createOrderEdits(prisma, credit, directories) : undefined;
  const lifecycle = credit ? createOrderLifecycle(prisma, credit, [() => creation!.recoverBatch(), () => edits!.recoverBatch()]) : undefined;
  const httpServer = createApp(publicKey, lifecycle, creation, edits).listen(env.PORT);
  try {
    await once(httpServer, 'listening');
    await startServer(grpcServer, env.GRPC_PORT, env.GRPC_HOST);
  } catch (error) {
    httpServer.close();
    grpcServer.forceShutdown();
    credit?.close();
    directories.close();
    await prisma.$disconnect();
    throw error;
  }
  console.log(`Order REST listening on :${env.PORT}; gRPC on ${env.GRPC_HOST}:${env.GRPC_PORT}`);

  lifecycle?.startWorker();
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await lifecycle?.stopWorker();
    await Promise.all([
      new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve())),
      stopServer(grpcServer),
    ]);
    credit?.close();
    directories.close();
    await prisma.$disconnect();
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => void shutdown().catch((error: unknown) => {
      console.error('Shutdown failed:', error);
      process.exitCode = 1;
    }));
  }
}

main().catch(async (error: unknown) => {
  console.error('Fatal error during startup:', error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
