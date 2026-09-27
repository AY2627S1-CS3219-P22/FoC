import express, { type Express } from 'express';
import { pingDatabase } from '../db';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const dbUp = await pingDatabase();
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
    });
  });

  return app;
}
