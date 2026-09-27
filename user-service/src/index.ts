import { env } from './env';
import { prisma } from './db';
import { createApp } from './rest/app';
import { startGrpcServer } from './grpc/server';

// Boots both servers: Express (REST) and gRPC (internal RPC).
async function main(): Promise<void> {
  const app = createApp();
  const httpServer = app.listen(env.PORT, () => {
    console.log(`REST server listening on http://localhost:${env.PORT}`);
  });

  const grpcServer = await startGrpcServer(env.GRPC_PORT);
  console.log(`gRPC server listening on 0.0.0.0:${env.GRPC_PORT}`);

  // Close servers and the DB pool.
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down...`);
    httpServer.close();
    grpcServer.forceShutdown();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
