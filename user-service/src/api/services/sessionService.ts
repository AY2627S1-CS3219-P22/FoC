import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../db';
import { env } from '../../env';

const DAY_MS = 24 * 60 * 60 * 1000;

// SHA-256, not bcrypt: the token is 256 random bits so it can't be brute-forced,
// and an unsalted hash lets us look the row up by hash.
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// Starts a session. Returns the raw token for the cookie; only its hash is stored.
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

// Ends one session. No-op if the token is unknown or already revoked.
export async function revokeSession(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
