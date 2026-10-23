// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
const access = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/admin-api', () => ({ requireAdminApiAccess: access }));
import { GET } from './route';

describe('exact pending approvals API', () => {
  it('requires admin authorization', async () => {
    access.mockResolvedValue({ adminAccess: null, error: new Response('Forbidden', { status: 403 }) });
    expect((await GET())?.status).toBe(403);
  });
  it('uses an exact count of pending alumni and faculty, without caching', async () => {
    const include = vi.fn().mockResolvedValue({ count: 1234, error: null });
    const eq = vi.fn().mockReturnValue({ in: include });
    const select = vi.fn().mockReturnValue({ eq });
    access.mockResolvedValue({ adminAccess: { database: { from: () => ({ select }) } }, error: null });
    const response = await GET();
    expect(await response?.json()).toEqual({ count: 1234 });
    expect(response?.headers.get('Cache-Control')).toBe('private, no-store');
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eq).toHaveBeenCalledWith('approval_status', 'pending');
    expect(include).toHaveBeenCalledWith('profile_type', ['alumni', 'faculty']);
  });
  it('does not misreport database failure as no pending approvals', async () => {
    access.mockResolvedValue({ adminAccess: { database: { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ count: null, error: { message: 'Offline' } }) }) }) }) } }, error: null });
    expect((await GET())?.status).toBe(503);
  });
});
