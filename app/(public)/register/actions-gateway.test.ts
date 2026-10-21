import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), client: vi.fn(), checkout: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
vi.mock('@/lib/payments/checkout', () => ({ startMembershipCheckout: mocks.checkout }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/resend/client', () => ({ APP_URL: 'https://davkawt.org', FROM_EMAIL: 'test@example.com',
  ADMIN_EMAIL: 'admin@example.com', getResend: () => ({ emails: { send: vi.fn().mockResolvedValue({}) } }) }));
import { registerAction } from './actions';

describe('registration creates an account and starts hosted checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('EASEBUZZ_KEY', 'test-key'); vi.stubEnv('EASEBUZZ_SALT', 'test-salt');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  function setup() {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.admin.mockReturnValue({ from: vi.fn().mockReturnValue({ insert }), storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: 'avatars' }] }),
      from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/photo.jpg' } }) }),
    } });
    mocks.client.mockResolvedValue({ auth: { signUp: vi.fn().mockResolvedValue({ error: null,
      data: { user: { id: 'member-id', identities: [{ id: 'identity' }], email_confirmed_at: null } } }) } });
    return { insert };
  }
  function form(amount: string) {
    const data = new FormData();
    for (const [key, value] of Object.entries({ email: 'asha@example.com', password: 'Password123', confirmPassword: 'Password123',
      full_name: 'Asha Kumar', education_level: 'secondary', passing_year: '2012', phone: '+919876543210',
      current_country: 'India', terms_accepted: 'on', selected_amount: amount })) data.set(key, value);
    data.set('profile_photo', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));
    return data;
  }
  it.each([['500', 'annual'], ['5000', 'lifetime']])('sends the %s plan to Easebuzz without screenshot proof', async (amount, membershipType) => {
    const { insert } = setup();
    mocks.checkout.mockResolvedValue({ paymentUrl: 'https://testpay.easebuzz.in/pay/test' });
    await registerAction({}, form(amount!));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'member-id', role: 'pending', approval_status: 'pending' }));
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ userId: 'member-id', membershipType, source: 'registration' }));
    expect(mocks.redirect).toHaveBeenCalledWith('https://testpay.easebuzz.in/pay/test');
  });
  it('keeps the saved registration and offers payment retry if checkout is unavailable', async () => {
    setup();
    mocks.checkout.mockRejectedValue(new Error('Unavailable'));
    await registerAction({}, form('500'));
    expect(mocks.redirect).toHaveBeenCalledWith('/register/payment?error=checkout_unavailable');
  });
});
