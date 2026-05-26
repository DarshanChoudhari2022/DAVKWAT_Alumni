'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry will auto-capture in production
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-600">
        An unexpected error occurred. The team has been notified.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
