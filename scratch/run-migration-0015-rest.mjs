/**
 * One-off script: add school_document_url column via Supabase REST API (rpc).
 * Run with: node scratch/run-migration-0015-rest.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jaeuirztfbozglvfrfav.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZXVpcnp0ZmJvemdsdmZyZmF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwODkxMCwiZXhwIjoyMDk1Mjg0OTEwfQ._5G-pzqM-x413BX6rpYEHySGHRZ5JiF2tT_70XPr2dw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Supabase doesn't expose DDL over the JS client directly.
// We'll use the Postgres REST endpoint via the Management API fetch.
const projectRef = 'jaeuirztfbozglvfrfav';
const sql = `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_document_url text;`;

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // This endpoint requires a Supabase Management API token, not service_role.
      // Fall back to the pg-meta endpoint instead:
    },
    body: JSON.stringify({ query: sql }),
  }
);

// Alternative: use the pg-meta introspection API bundled with every Supabase project
// POST https://<ref>.supabase.co/pg/query  (requires service_role bearer)
const pgMetaResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql }),
});

console.log('Status:', pgMetaResp.status);
const body = await pgMetaResp.text();
console.log('Body:', body);
