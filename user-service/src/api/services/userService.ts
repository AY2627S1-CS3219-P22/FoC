import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';

const SALT_ROUNDS = 10;

// Fields safe to expose to clients — deliberately excludes passwordHash.
const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  email: true,
  roles: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Registers a user (F1). Input is already validated by the DTO, so this only
// does business logic: reject a duplicate email/username, hash the password,
// and create the record. Returns a discriminated result the controller maps to
// a status code (201 on success, 409 on conflict).
export async function register(input: RegisterInput) {
  // Friendly pre-check for a clear message. The DB also enforces uniqueness via
  // @unique, which is the real guard against race conditions.
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
    throw err; // anything else is a genuine error — let it propagate
  }
}

// Verifies login credentials (F2.1). Returns a discriminated result the
// controller maps to a response: sign a JWT on success, 401 on failure. The
// failure case is deliberately generic — it does not distinguish "unknown email"
// from "wrong password" — to satisfy F2.1.1 without leaking which field was
// wrong (also avoids user enumeration).
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    // passwordHash + roles are needed here but stay inside the service; only the
    // id and roles leave, folded into the signed token.
    select: { id: true, passwordHash: true, roles: true },
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return { ok: false as const };
  }

  return { ok: true as const, userId: user.id, roles: user.roles };
}

// Fetches a single user's public profile by id (F2.3). Returns null if the id
// doesn't exist. Uses publicUserSelect, so passwordHash is never returned.
export async function getProfileById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

// Lists all users' public profiles. Guarded as an ADMINISTRATOR-only capability
// at the route layer — used to demonstrate RBAC enforcement.
export async function listProfiles() {
  return prisma.user.findMany({ select: publicUserSelect });
}
