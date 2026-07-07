const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log('Success via Prisma!', profiles);
  } catch (error) {
    console.error('Error via Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
