const { PrismaClient } = require('@prisma/client');

// Use direct DB host instead of pooler
const directUrl = "postgresql://postgres.jaeuirztfbozglvfrfav:Bliss%408605589062@db.jaeuirztfbozglvfrfav.supabase.co:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

async function run() {
  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log('Success via Direct Prisma!', profiles);
  } catch (error) {
    console.error('Error via Direct Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
