/**
 * One-off migration: add school_document_url to profiles.
 * Uses the pg-meta /query endpoint bundled with every Supabase project.
 * Run: node --experimental-vm-modules scratch/migrate-0015.mjs
 */

const SUPABASE_URL = 'https://jaeuirztfbozglvfrfav.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZXVpcnp0ZmJvemdsdmZyZmF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwODkxMCwiZXhwIjoyMDk1Mjg0OTEwfQ._5G-pzqM-x413BX6rpYEHySGHRZ5JiF2tT_70XPr2dw';

const sql = `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_document_url text;`;

// pg-meta is exposed at /pg/query on hosted Supabase projects
const resp = await fetch(`${SUPABASE_URL}/pg/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

console.log('HTTP status:', resp.status);
const text = await resp.text();
console.log('Response:', text);

if (!resp.ok) {
  console.error('Migration failed!');
  process.exit(1);
} else {
  console.log('Migration applied successfully.');
}
