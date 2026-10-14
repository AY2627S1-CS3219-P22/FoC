import { startServer, stopServer } from '@foc/grpc';
import { env } from './env';
import { createGrpcServer } from './grpc/server';
import { CreditDatabase, createPool } from './database/database';
import { CreditService } from './services/credit-service';
import { securityConfig, transportCredentials } from './security/config';

async function main(): Promise<void> {
  const config = securityConfig();
  const credentials = transportCredentials();
  const pool = createPool(env.DATABASE_URL);
  let server: ReturnType<typeof createGrpcServer>;
  let port: number;
  try {
    server = createGrpcServer(new CreditService(new CreditDatabase(pool)), config);
    await pool.query('SELECT 1 FROM credit.schema_migrations LIMIT 1');
    port = await startServer(server, env.GRPC_PORT, env.GRPC_HOST, credentials);
  } catch (error) {
    await pool.end();
    throw error;
  }
  console.log('credit-service gRPC listening on ' + env.GRPC_HOST + ':' + port);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await stopServer(server);
    await pool.end();
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error: unknown) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
