import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/0009_harden_profile_access.sql'),
  'utf8'
);

describe('profile access hardening migration', () => {
  it('removes direct self-insert and public profile-row access', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "profiles_self_insert"');
    expect(migration).toContain('DROP POLICY IF EXISTS "profiles_public_count"');
  });

  it('protects every profile privilege field', () => {
    for (const field of [
      'role',
      'approval_status',
      'approved_at',
      'approved_by',
      'rejection_reason',
      'membership_type',
      'membership_expires_at',
      'is_paid_member',
      'is_active',
    ]) {
      expect(migration).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
    }
  });

  it('requires database admins to be approved and active', () => {
    expect(migration).toContain("AND approval_status = 'approved'");
    expect(migration).toContain('AND is_active = true');
  });

  it('exposes only a count RPC to public roles', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_public_alumni_count()');
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_public_alumni_count() TO anon, authenticated, service_role'
    );
  });
});
