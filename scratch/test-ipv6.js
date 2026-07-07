const { PrismaClient } = require('@prisma/client');

// Use direct IPv6 address
const url = "postgresql://postgres.jaeuirztfbozglvfrfav:Bliss%408605589062@[2406:da18:167b:f901:36cd:f576:2898:50d8]:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log('Success via IPv6 Direct Prisma!', profiles);
  } catch (error) {
    console.error('Error via IPv6 Direct Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
