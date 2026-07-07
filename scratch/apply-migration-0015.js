/**
 * One-off migration: adds school_document_url column to profiles table.
 * Uses Supabase service role + the rpc exec_sql or direct REST SQL.
 * Run: node scratch/apply-migration-0015.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Applying migration: adding school_document_url column...');

  // Use the Supabase Management REST API SQL endpoint
  // POST /rest/v1/rpc/<function> won't work for DDL unless we have an exec_sql RPC.
  // Instead we hit the REST SQL endpoint directly:
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  // The Supabase JS client doesn't expose DDL directly.
  // We use the Management API via the project ref instead:
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)[1];
  console.log('Project ref:', projectRef);

  // NOTE: This requires a Supabase personal access token (PAT), not service_role.
  // Fallback: create a temporary RPC function to run DDL.
  
  // Step 1: Create helper function
  const createFn = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
  });

  // Since we can't run raw DDL via the REST API without an exec_sql RPC,
  // let's check if the column already exists and print instructions instead.
  console.log('\n=== Cannot run DDL directly via REST API ===');
  console.log('Run this SQL in your Supabase Dashboard > SQL Editor:\n');
  console.log('ALTER TABLE public.profiles');
  console.log('  ADD COLUMN IF NOT EXISTS school_document_url text;\n');
  console.log('Or link your project: npx supabase link --project-ref', projectRef);
  console.log('Then run: npx supabase db push');
}

run().catch(console.error);
