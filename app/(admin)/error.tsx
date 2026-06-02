'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary for the admin segment (Req 3.7, defense-in-depth).
 *
 * If an admin page (or one of its streamed regions) throws an error that isn't
 * caught by a region-local try/catch, this boundary renders a scoped, recoverable
 * error inside the admin chrome instead of escalating to the global white-screen
 * boundary (`app/error.tsx`). `reset()` re-renders the segment so a transient
 * failure can recover without a full reload.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] segment error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        This page hit a problem
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Something went wrong loading this admin page. You can retry, or head back to the dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/admin">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
