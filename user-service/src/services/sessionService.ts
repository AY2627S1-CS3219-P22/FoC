import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db';
import { env } from '../env';

const DAY_MS = 24 * 60 * 60 * 1000;

// SHA-256, not bcrypt: the token is 256 random bits so it can't be brute-forced,
// and an unsalted hash lets us look the row up by hash.
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

// A fresh raw token + its expiry (sliding: every new token gets the full TTL).
function newToken() {
  return {
    token: randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
  };
}

// Starts a session. Returns the raw token for the cookie; only its hash is stored.
export async function createSession(userId: string) {
  const { token, expiresAt } = newToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

// Swaps a valid refresh token for a new one (single use), returning the user's
// current roles so the new access token reflects any role changes.
export async function rotateSession(token: string) {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { roles: true, isDeleted: true } },
    },
  });

  if (!row || row.revokedAt || row.expiresAt <= new Date() || row.user.isDeleted) {
    return { ok: false as const };
  }

  return prisma.$transaction(async (transaction) => {
    // Revoke only if still live: if two refreshes race with the same token,
    // the database lets exactly one of them through.
    const { count } = await transaction.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return { ok: false as const };

    const next = newToken();
    await transaction.refreshToken.create({
      data: { userId: row.userId, tokenHash: hashToken(next.token), expiresAt: next.expiresAt },
    });

    return {
      ok: true as const,
      userId: row.userId,
      roles: row.user.roles,
      token: next.token,
      expiresAt: next.expiresAt,
    };
  });
}

// Ends one session. No-op if the token is unknown or already revoked.
export async function revokeSession(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
