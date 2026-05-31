import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client for server-side database operations.
 * Instantiated lazily so route-module evaluation during build does not
 * eagerly touch Prisma before a request actually needs it.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  return globalForPrisma.prisma;
}
