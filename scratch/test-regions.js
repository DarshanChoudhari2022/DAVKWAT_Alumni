const { PrismaClient } = require('@prisma/client');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'eu-west-1'
];

async function testRegion(region) {
  const url = `postgresql://postgres.jaeuirztfbozglvfrfav:Bliss%408605589062@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const profiles = await prisma.profiles.findMany({ take: 1 });
    console.log(`Success with region ${region}!`);
    return true;
  } catch (error) {
    console.log(`Failed for region ${region}:`, error.message || error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  for (const region of regions) {
    console.log(`Testing region: ${region}...`);
    const success = await testRegion(region);
    if (success) break;
  }
}

run();
