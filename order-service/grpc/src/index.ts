// AI Assistance Disclosure: ChatGPT (Codex), 2026-10-21.
// Scope: Generated setup implementation following approved User Service conventions.
// Author review: Pending; see ../../usage-log.md.
import { once } from 'node:events';
import { startServer, stopServer } from '@foc/grpc';
import { env } from './env';
import { prisma } from './db';
import { createApp } from './api/app';
import { createGrpcServer } from './grpc/server';
import { createClients } from './grpc/clients';

async function main(): Promise<void> {
  await prisma.$connect();
  const grpcServer = createGrpcServer();
  const clients = createClients();
  const httpServer = createApp().listen(env.PORT);
  try {
    await once(httpServer, 'listening');
    await startServer(grpcServer, env.GRPC_PORT, env.GRPC_HOST);
  } catch (error) {
    httpServer.close();
    grpcServer.forceShutdown();
    clients.close();
    await prisma.$disconnect();
    throw error;
  }
  console.log(`Order REST listening on :${env.PORT}; gRPC on ${env.GRPC_HOST}:${env.GRPC_PORT}`);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await Promise.all([
      new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve())),
      stopServer(grpcServer),
    ]);
    clients.close();
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
