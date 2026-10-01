import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';

const SALT_ROUNDS = 10;

const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  email: true,
  roles: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

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

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        email: input.email,
        passwordHash,
      },
      select: publicUserSelect,
    });
    return { ok: true as const, user };
  } catch (err) {
    // Safety net for the check-then-insert race: the DB's @unique constraint
    // rejects a duplicate that slipped past the pre-check (Prisma code P2002).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = err.meta?.target;
      const hitEmail = Array.isArray(target)
        ? target.includes('email')
        : String(target ?? '').includes('email');
      return { ok: false as const, field: hitEmail ? ('email' as const) : ('username' as const) };
    }
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

export async function getProfileById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export async function listProfiles() {
  return prisma.user.findMany({ select: publicUserSelect });
}
