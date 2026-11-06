// AI-assisted (Claude), reviewed and tested by Maliha
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { requireAdmin, type AuthUser } from './auth';
import { setupChat } from './chat';
import * as db from './db';
import { env } from './env';
import { KEEP_MS } from './rules';

const app = express();
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await db.pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db-unavailable' });
  }
});

// ── Admin: flagged messages (F10.5) ──
// Everything is under /chat so nginx can forward /backend/chat as is

app.get('/chat/flags', requireAdmin, async (req, res) => {
  const flags = await db.listFlags(req.query.include === 'reviewed');
  res.json({ flags });
});

app.post('/chat/flags/:id/review', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'invalid-input' });
    return;
  }
  const admin = res.locals.user as AuthUser;
  if (!(await db.reviewFlag(id, admin.id))) {
    res.status(404).json({ error: 'not-found' });
    return;
  }
  res.status(204).end();
});

// Express 5 passes rejected promises here
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[http]', err);
  res.status(500).json({ error: 'internal' });
});

const server = createServer(app);
const io = new Server(server, { path: '/chat/socket.io' });
setupChat(io);

// F10.4.1: chats are deleted 1 h after the errand ends
const CLEANUP_EVERY_MS = 5 * 60_000;
const cleanup = () =>
  db.deleteOldChats(KEEP_MS)
    .then((n) => n && console.log(`[cleanup] deleted ${n} ended chat(s)`))
    .catch((err) => console.error('[cleanup]', err));

async function main() {
  await db.migrate();
  setInterval(cleanup, CLEANUP_EVERY_MS).unref();
  cleanup();
  server.listen(env.PORT, () => console.log(`chat-service on :${env.PORT}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// let docker stop finish open requests
process.on('SIGTERM', () => {
  io.close();
  server.close(() => db.pool.end().then(() => process.exit(0)));
});