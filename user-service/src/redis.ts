import { createClient } from 'redis';
import { env } from './env';

export const redis = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy(retries) {
      if (retries > 3) return new Error('Redis unavailable');
      return Math.min(retries * 100, 1000);
    },
  },
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.isOpen) {
    await redis.quit();
  }
}
