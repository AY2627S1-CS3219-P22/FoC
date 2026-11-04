import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { redis } from '../redis';
import type { RegisterInput } from '../api/dto/registerDto';
import type { LoginInput } from '../api/dto/loginDto';
import type { RegisterVerifyInput } from '../api/dto/otpDto';
import type { UpdateProfileInput } from '../api/dto/updateProfileDto';
import { enqueueUserCreated } from '../events/outboxStore';
import { otpKeyPrefix, sendOTPRequest, verifyOTP } from './otpService';

const SALT_ROUNDS = 10;
const REGISTER_CHALLENGE = 'register'; //hardcoded, resend keeps three fail lock
const PENDING_TTL_SECONDS = 120;

type PendingRegistration = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
};

function pendingKey(email: string) {
  return `${otpKeyPrefix(REGISTER_CHALLENGE, email)}:pending`;
}

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

// Shared by initiateRegister and the admin bootstrap so every
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

//a check before starting registration process instead of just parsing prisma output
async function findDuplicate(email: string, username: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (!existing) return null;
  return existing.email === email ? ('email' as const) : ('username' as const);
}

// HTTP register start: stash the form in Redis and email an OTP. No User row yet.
export async function initiateRegister(input: RegisterInput) {
  const field = await findDuplicate(input.email, input.username); //extra check to make sure user doesn't exist
  if (field) return { ok: false as const, field };

  const pending = await buildNewUser(input); //standardize
  const key = pendingKey(input.email); //lock into redis so we dont create the user just yet
  await redis.set(key, JSON.stringify(pending), { EX: PENDING_TTL_SECONDS });

  try {
    const otpResult = await sendOTPRequest({
      email: input.email,
      challengeId: REGISTER_CHALLENGE,
    });
    if (!otpResult.ok) {
      await redis.del(key);
      return otpResult;
    }
  } catch (err) {
    await redis.del(key).catch(() => undefined);
    throw err;
  }

  return { ok: true as const };
}

// HTTP register verify: consume the OTP, load pending info, then create the account.
//skips buildNewUser logic because password hashing happens in initiateRegister
export async function completeRegister(input: RegisterVerifyInput) {
  const otpResult = await verifyOTP({
    email: input.email,
    challengeId: REGISTER_CHALLENGE,
    otp: input.otp,
    pendingKey: pendingKey(input.email),
  });
  if (!otpResult.ok) return otpResult;
  if (!otpResult.pending) return { ok: false as const, reason: 'missing' as const };

  const pending = JSON.parse(otpResult.pending) as PendingRegistration;

  const field = await findDuplicate(pending.email, pending.username);
  if (field) return { ok: false as const, field };

  // TODO(F2.7): refuse or restore a soft-deleted account with this email.

  try {
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.user.create({
        data: {
          firstName: pending.firstName,
          lastName: pending.lastName,
          username: pending.username,
          email: pending.email,
          passwordHash: pending.passwordHash,
        },
        select: profileSelect,
      });
      await enqueueUserCreated(tx, created.id);
      return created;
    });
    return { ok: true as const, user };
  } catch (err) {
    const taken = duplicateField(err);
    if (taken) return { ok: false as const, field: taken };
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
    where: { id, isDeleted: false },
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
