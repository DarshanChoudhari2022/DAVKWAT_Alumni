import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
  redirect: vi.fn(),
}));

const clients = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: clients.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: clients.createAdminClient }));

import RegisterPage from '@/app/(public)/register/page';
import FacultyPage from '@/app/(public)/register/faculty/page';
import PaymentPage from '@/app/(public)/register/payment/page';
import { registerAction, checkEmailExists } from '@/app/(public)/register/actions';

describe('only the final registration payment step is closed', () => {
  it('opens registration forms and returns 404 only for the payment page', () => {
    expect(() => RegisterPage()).not.toThrow();
    expect(() => FacultyPage()).not.toThrow();
    expect(() => PaymentPage()).toThrow('404');
    expect(clients.createClient).not.toHaveBeenCalled();
    expect(clients.createAdminClient).not.toHaveBeenCalled();
  });

  it('blocks final paid registration submissions before any backend access', async () => {
    await expect(registerAction({}, new FormData())).rejects.toThrow('404');
    expect(clients.createClient).not.toHaveBeenCalled();
    expect(clients.createAdminClient).not.toHaveBeenCalled();
  });

  it('allows the account step to check whether an email already exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    clients.createAdminClient.mockReturnValue({ from });
    await expect(checkEmailExists('alumni@example.com')).resolves.toBe(false);
    expect(from).toHaveBeenCalledWith('profiles');
  });
});
