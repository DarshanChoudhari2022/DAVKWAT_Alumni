const { PrismaClient } = require('@prisma/client');

// Test connection using user 'postgres'
const url = "postgresql://postgres:Bliss%408605589062@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log('Success with postgres user!', profiles);
  } catch (error) {
    console.error('Error with postgres user:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
