import { PrismaClient } from './generated/prisma';

export function createDatabase() {
  return new PrismaClient();
}

export async function pingDatabase(db: PrismaClient): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
