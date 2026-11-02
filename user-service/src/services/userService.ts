// AI Assistance Disclosure:
// Tool: Claude Code (Claude Opus), 2026-09-27 – 2026-10-19; OpenAI Codex,
// 2026-11-02 (Asia/Singapore).
// Scope: AI generated the register logic (duplicate check, P2002 handling,
// bcryptjs hashing), login credential checks, profile/public-profile selects,
// profile update, shared buildNewUser/duplicateField helpers, account
// deletion, user.deleted enqueueing, and archived-account restoration with
// user.restored enqueueing.
// Author review: Author specified the requirements, duplicate handling,
// fields, update rules, deletion workflow, and restore behavior. Entries
// 004, 008, 009, 013, 015, 019, 025, and 026 were reviewed, manually tested,
// and approved. Author also reviewed, manually tested, and approved entry 027.
// See user-service/ai/usage-log.md.

import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { RegisterInput } from '../api/dto/registerDto';
import type { LoginInput } from '../api/dto/loginDto';
import type { UpdateProfileInput } from '../api/dto/updateProfileDto';
import { enqueueUserCreated, enqueueUserDeleted, enqueueUserRestored } from '../events/outboxStore';
import { ensureNotLastAdmin, lockAdminSet } from './adminGuards';

const SALT_ROUNDS = 10;
const RETENTION_YEARS = 4;

// Profile: everything except secrets — for the user themselves or an admin.
export const profileSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  email: true,
  roles: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Public profile: what anyone may see — for other services.
const publicProfileSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

// Shared by register and the admin bootstrap so every
// account is built the same way.
export async function buildNewUser(input: RegisterInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    username: input.username,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
  };
}

// Which field a unique-constraint violation (Prisma P2002) hit, or null if
// it's not a duplicate email/username.
export function duplicateField(err: unknown): 'email' | 'username' | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return null;
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
  if (fields.includes('email')) return 'email';
  if (fields.includes('username')) return 'username';
  return null;
}

export async function register(input: RegisterInput) {
  // Check duplicate email or username
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === input.email ? 'email' : 'username';
    return { ok: false as const, field };
  }

  const archived = await prisma.archivedUser.findUnique({ where: { email: input.email } });
  const now = new Date();
  // Past its 4 years, the row is ignored and deleted below: a normal signup.
  const restoreFrom = archived && archived.purgeAfter > now ? archived : null;
  if (restoreFrom && !input.confirmRestore) {
    return { ok: false as const, reason: 'restore_confirmation_required' as const };
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: await buildNewUser(input),
        select: profileSelect,
      });
      if (restoreFrom) {
        await enqueueUserRestored(tx, created.id, restoreFrom.userId);
        await tx.archivedUser.delete({ where: { email: restoreFrom.email } });
      } else {
        await tx.archivedUser.deleteMany({ where: { email: input.email, purgeAfter: { lte: now } } });
        await enqueueUserCreated(tx, created.id);
      }
      return created;
    });
    return { ok: true as const, user };
  } catch (err) {
    // Safety net for the check-then-insert race: the DB's @unique constraint
    // rejects a duplicate that slipped past the pre-check (Prisma code P2002).
    const field = duplicateField(err);
    if (field) return { ok: false as const, field };
    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true, roles: true },
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return { ok: false as const };
  }

  return { ok: true as const, userId: user.id, roles: user.roles };
}

export async function getProfile(id: string) {
  return prisma.user.findUnique({ 
    where: { id }, 
    select: profileSelect });
}

export async function getPublicProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: publicProfileSelect,
  });
}

export async function updateProfile(id: string, input: UpdateProfileInput) {
  if (input.username) {
    const taken = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id } },
      select: { id: true },
    });
    if (taken) return { ok: false as const, reason: 'username_taken' as const };
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: input, select: profileSelect });
    return { ok: true as const, user };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return { ok: false as const, reason: 'username_taken' as const };
      if (err.code === 'P2025') return { ok: false as const, reason: 'not_found' as const };
    }
    throw err;
  }
}

export async function listProfiles() {
  return prisma.user.findMany({ select: profileSelect });
}

// Temporary stub for the future Order Service eligibility gRPC.
export async function checkDeletionEligibility(_userId: string) {
  return { eligible: true as const, activeOrders: 0 };
}

function addRetentionYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export async function deleteAccount(userId: string) {
  const eligibility = await checkDeletionEligibility(userId);
  if (!eligibility.eligible) {
    return { ok: false as const, reason: 'active_orders' as const, activeOrders: eligibility.activeOrders };
  }

  return prisma.$transaction(async (tx) => {
    await lockAdminSet(tx);

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, roles: true },
    });
    if (!user) return { ok: false as const, reason: 'not_found' as const };

    // The guard only counts other admins, so it must not run for a non-admin.
    if (user.roles.includes('ADMINISTRATOR')) {
      const guard = await ensureNotLastAdmin(tx, user.id);
      if (!guard.ok) return guard;
    }

    const deletedAt = new Date();
    const purgeAfter = addRetentionYears(deletedAt, RETENTION_YEARS);

    await tx.archivedUser.create({ data: { email: user.email, userId: user.id, deletedAt, purgeAfter } });
    await tx.user.delete({ where: { id: user.id } });
    await enqueueUserDeleted(tx, user.id, deletedAt);

    return { ok: true as const, deletedAt, purgeAfter };
  });
}
