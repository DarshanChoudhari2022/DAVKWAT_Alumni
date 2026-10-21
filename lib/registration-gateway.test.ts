import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
const clients = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: clients.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: clients.createAdminClient }));

import RegisterPage from '@/app/(public)/register/page';
import FacultyPage from '@/app/(public)/register/faculty/page';
import { registerAction } from '@/app/(public)/register/actions';

describe('registration gateway validation', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('opens both registration forms', () => {
    expect(() => RegisterPage()).not.toThrow();
    expect(() => FacultyPage()).not.toThrow();
  });
  it.each(['1', '499', '501', '4999', '5001', '500.01', '-500', 'NaN'])('rejects a tampered amount %s before creating an account', async (amount) => {
    const form = new FormData();
    form.set('selected_amount', amount);
    expect(await registerAction({}, form)).toMatchObject({ fieldErrors: { selected_amount: expect.any(String) } });
    expect(clients.createClient).not.toHaveBeenCalled();
    expect(clients.createAdminClient).not.toHaveBeenCalled();
  });
  it('reports missing gateway config before creating an account', async () => {
    vi.stubEnv('EASEBUZZ_KEY', '');
    const form = new FormData();
    form.set('selected_amount', '500');
    expect(await registerAction({}, form)).toMatchObject({ error: expect.stringContaining('not configured') });
    expect(clients.createClient).not.toHaveBeenCalled();
  });
});
