import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
  redirect: vi.fn(),
}));

const clients = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: clients.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: clients.createAdminClient }));

import RegisterPage from '@/app/(public)/register/page';
import CompletePage from '@/app/(public)/register/complete/page';
import FacultyPage from '@/app/(public)/register/faculty/page';
import { registerAction, checkEmailExists, uploadSchoolDocument } from '@/app/(public)/register/actions';
import { completeRegistrationAction } from '@/app/(public)/register/complete/actions';
import { facultyRegisterAction } from '@/app/(public)/register/faculty/actions';

describe('registration is closed pending the payment gateway', () => {
  it('shows 404 instead of the registration forms', async () => {
    expect(() => RegisterPage()).toThrow('404');
    expect(() => FacultyPage()).toThrow('404');
    await expect(CompletePage()).rejects.toThrow('404');
    expect(clients.createClient).not.toHaveBeenCalled();
    expect(clients.createAdminClient).not.toHaveBeenCalled();
  });

  it('blocks direct submissions and uploads before any backend access', async () => {
    for (const action of [registerAction, completeRegistrationAction, facultyRegisterAction]) {
      await expect(action({}, new FormData())).rejects.toThrow('404');
    }
    await expect(checkEmailExists('alumni@example.com')).rejects.toThrow('404');
    await expect(uploadSchoolDocument('user-id', new File(['data'], 'document.pdf'))).rejects.toThrow('404');
    expect(clients.createClient).not.toHaveBeenCalled();
    expect(clients.createAdminClient).not.toHaveBeenCalled();
  });
});
