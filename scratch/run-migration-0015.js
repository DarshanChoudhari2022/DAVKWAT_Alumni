/**
 * One-off script: add school_document_url column to profiles table.
 * Run with: node scratch/run-migration-0015.js
 */
const { Client } = require('pg');

const DIRECT_URL =
  'postgresql://postgres.jaeuirztfbozglvfrfav:Bliss%408605589062@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString: DIRECT_URL });
  await client.connect();
  console.log('Connected to database.');

  const sql = `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_document_url text;`;
  console.log('Running migration:', sql);

  const result = await client.query(sql);
  console.log('Migration succeeded:', result.command);

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
