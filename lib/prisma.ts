import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client for server-side database operations.
 * In development, the client is stored on `globalThis` to survive HMR.
 * In production, a single instance is created.
 *
 * NOTE: Prisma handles all DB reads/writes. Supabase Auth (signUp, signIn,
 * signOut, getUser) still goes through the Supabase JS SDK.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
