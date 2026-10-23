'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export const APPROVALS_CHANGED = 'admin:approvals-changed';
const PendingCount = createContext<number | null>(null);

export function PendingApprovalsProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const queuedRef = useRef(false);
  const pathname = usePathname();
  const refresh = useCallback(async function refreshCount() {
    if (requestRef.current) { queuedRef.current = true; return; }
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch('/api/admin/approvals/count', { cache: 'no-store', signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !Number.isSafeInteger(result.count) || result.count < 0) throw new Error('Unavailable');
      if (!controller.signal.aborted) setCount(result.count);
    } catch {
      if (!controller.signal.aborted) setCount(null);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (queuedRef.current && !controller.signal.aborted) { queuedRef.current = false; void refreshCount(); }
    }
  }, []);

  useEffect(() => { void refresh(); }, [pathname, refresh]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(update, 30_000);
    window.addEventListener('focus', update);
    window.addEventListener(APPROVALS_CHANGED, update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener(APPROVALS_CHANGED, update);
      document.removeEventListener('visibilitychange', update);
      queuedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);
  return <PendingCount.Provider value={count}>{children}</PendingCount.Provider>;
}

export function PendingApprovalsBadge() {
  const count = useContext(PendingCount);
  const label = count === null ? 'Pending approvals count loading or unavailable' : `${count} pending approvals`;
  return <span aria-label={label} title={label} aria-live="polite" aria-atomic="true"
    className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold tabular-nums text-white">
    {count === null ? '…' : count}
  </span>;
}
