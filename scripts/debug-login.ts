/**
 * Debug script: Test login directly against Supabase Auth
 * Run with: npx tsx scripts/debug-login.ts
 * 
 * This bypasses the app entirely to check if the issue is
 * at the Supabase level or in the app code.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const EMAIL = 'choudharidarshan5453@gmail.com';

async function main() {
  console.log('=== Supabase Login Debug ===\n');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Email:', EMAIL);
  console.log('');

  // 1. Check if user exists in auth.users via admin API
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('--- Step 1: Check user exists in auth.users ---');
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  
  if (listError) {
    console.error('Failed to list users:', listError.message);
    return;
  }

  const authUser = usersData.users.find(u => u.email === EMAIL);
  if (!authUser) {
    console.error('❌ User NOT FOUND in auth.users! The auth account does not exist.');
    console.log('   This means the user has a profile row but no auth account.');
    console.log('   Solution: User needs to re-register.');
    return;
  }

  console.log('✅ User found in auth.users');
  console.log('   ID:', authUser.id);
  console.log('   Email confirmed:', authUser.email_confirmed_at ? 'YES' : 'NO');
  console.log('   Created at:', authUser.created_at);
  console.log('   Last sign in:', authUser.last_sign_in_at);
  console.log('   Banned until:', authUser.banned_until || 'NOT BANNED');
  console.log('   Identities:', authUser.identities?.length ?? 0);
  console.log('');

  if (!authUser.email_confirmed_at) {
    console.log('⚠️  Email is NOT confirmed. This will prevent login.');
    console.log('   Fix: Confirm email in Supabase Dashboard or run:');
    console.log("   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '" + EMAIL + "';");
    console.log('');
  }

  if (authUser.banned_until) {
    console.log('⚠️  User is BANNED until:', authUser.banned_until);
    console.log('   This will prevent login.');
    console.log('');
  }

  // 2. Check profile exists
  console.log('--- Step 2: Check profile exists ---');
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, role, approval_status')
    .eq('email', EMAIL)
    .maybeSingle();

  if (profileError) {
    console.error('Profile query error:', profileError.message);
  } else if (!profile) {
    console.error('❌ No profile row found for this email!');
    console.log('   Login will fail at the profile check step.');
  } else {
    console.log('✅ Profile found');
    console.log('   Profile ID:', profile.id);
    console.log('   Name:', profile.full_name);
    console.log('   Role:', profile.role);
    console.log('   Approval:', profile.approval_status);
    
    if (profile.id !== authUser.id) {
      console.log('');
      console.error('⚠️  MISMATCH: Profile ID does not match Auth user ID!');
      console.log('   Auth ID:', authUser.id);
      console.log('   Profile ID:', profile.id);
      console.log('   This will cause login to fail at the profile lookup step.');
    }
  }
  console.log('');

  // 3. Try to sign in with a dummy password to see the error
  console.log('--- Step 3: Test signInWithPassword ---');
  console.log('   (Testing with a dummy password to see the error type)');
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: 'test_dummy_password_12345',
  });

  if (signInError) {
    console.log('   Error message:', signInError.message);
    console.log('   Error status:', signInError.status);
    
    if (signInError.message.includes('Invalid login credentials')) {
      console.log('   → This means the user exists but password is wrong.');
      console.log('   → The account is NOT locked/banned.');
    } else if (signInError.message.includes('Email not confirmed')) {
      console.log('   → Email confirmation is required but not done.');
    } else if (signInError.message.includes('rate') || signInError.message.includes('limit')) {
      console.log('   → Rate limited! Too many attempts.');
    }
  } else {
    console.log('   ⚠️ Login succeeded with dummy password?! Something is very wrong.');
  }

  console.log('\n--- Step 4: Admin password reset ---');
  console.log('   To force-reset the password, run this script with --reset flag');
  console.log('   Or use Supabase Dashboard → Authentication → Users → click user → Reset password');
  
  if (process.argv.includes('--reset')) {
    const NEW_PASSWORD = 'Darshan@2021';
    console.log(`\n   Resetting password to: ${NEW_PASSWORD}`);
    const { error: resetError } = await admin.auth.admin.updateUserById(authUser.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });
    if (resetError) {
      console.error('   ❌ Reset failed:', resetError.message);
    } else {
      console.log('   ✅ Password reset successful! Email also confirmed.');
      console.log(`   Try logging in with: ${EMAIL} / ${NEW_PASSWORD}`);
    }
  }
}

main().catch(console.error);
