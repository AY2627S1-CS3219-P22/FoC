import express, { type ErrorRequestHandler } from 'express';
import type { AuthProvider } from '../auth/authProvider';
import type { OrderReads } from './services/orderService';
import { createOrderRouter } from './routes/orderRoutes';

export interface AppDependencies {
  authProvider: AuthProvider;
  orders: OrderReads;
  pingDatabase: () => Promise<boolean>;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.use(express.json());
  app.get('/health', async (_req, res) => {
    const up = await dependencies.pingDatabase();
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down' });
  });
  app.use('/orders', createOrderRouter(dependencies.authProvider, dependencies.orders));
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Unexpected server error.' });
  };
  app.use(handleError);
  return app;
}
