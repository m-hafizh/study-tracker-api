import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectToDatabase = async (): Promise<void> => {
  await prisma.$connect();
};

export const closeDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
