import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/approvals' }));
import { PendingApprovalsProvider, PendingApprovalsBadge, APPROVALS_CHANGED } from './PendingApprovalsCount';
import { AdminMobileNav } from './AdminMobileNav';

afterEach(() => vi.unstubAllGlobals());
describe('shared approvals count', () => {
  it('shares one exact count across desktop, mobile header and the open mobile menu', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 127 }) });
    vi.stubGlobal('fetch', fetcher);
    render(<PendingApprovalsProvider>
      <PendingApprovalsBadge />
      <AdminMobileNav displayName="Admin" logoutAction={vi.fn()} />
    </PendingApprovalsProvider>);
    await waitFor(() => expect(screen.getAllByLabelText('127 pending approvals')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByLabelText('127 pending approvals')).toHaveLength(3);
    for (const badge of screen.getAllByLabelText('127 pending approvals')) expect(badge).toHaveClass('bg-red-600');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('refreshes from the database after approval/rejection rather than guessing a count', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 4 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 2 }) });
    vi.stubGlobal('fetch', fetcher);
    render(<PendingApprovalsProvider><PendingApprovalsBadge /></PendingApprovalsProvider>);
    await screen.findByLabelText('4 pending approvals');
    await act(async () => { window.dispatchEvent(new Event(APPROVALS_CHANGED)); });
    expect(await screen.findByLabelText('2 pending approvals')).toBeInTheDocument();
  });
  it('shows zero explicitly and does not turn a failed request into a false zero', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 0 }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unavailable' }) });
    vi.stubGlobal('fetch', fetcher);
    render(<PendingApprovalsProvider><PendingApprovalsBadge /></PendingApprovalsProvider>);
    expect(await screen.findByLabelText('0 pending approvals')).toHaveTextContent('0');
    await act(async () => { window.dispatchEvent(new Event(APPROVALS_CHANGED)); });
    expect(await screen.findByLabelText('Pending approvals count loading or unavailable')).toHaveTextContent('…');
  });
});
