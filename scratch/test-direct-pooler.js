const { PrismaClient } = require('@prisma/client');

// Test using direct URL (port 5432) on the pooler
const url = "postgresql://postgres.jaeuirztfbozglvfrfav:Bliss%408605589062@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log('Success via Direct Pooler!', profiles);
  } catch (error) {
    console.error('Error via Direct Pooler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
