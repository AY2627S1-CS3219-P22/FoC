import { readEnvironment } from './env';
import { createDatabase, pingDatabase } from './db';
import { createAuthProvider } from './auth/createAuthProvider';
import { createApp } from './api/app';
import { createOrderService } from './api/services/orderService';

async function main(): Promise<void> {
  const env = readEnvironment();
  const authProvider = createAuthProvider(env);
  const db = createDatabase();
  const app = createApp({ authProvider, orders: createOrderService(db), pingDatabase: () => pingDatabase(db) });
  const server = app.listen(env.PORT, () => console.log(`Order REST listening on port ${env.PORT}`));
  server.on('error', (error) => {
    console.error('Order REST failed to start:', error);
    void db.$disconnect().finally(() => { process.exitCode = 1; });
  });
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => {
      server.closeAllConnections();
      void db.$disconnect().finally(() => process.exit(1));
    }, 5000);
    timeout.unref();
    server.close(() => {
      void db.$disconnect().finally(() => clearTimeout(timeout));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Order Service startup failed:', error);
  process.exitCode = 1;
});
