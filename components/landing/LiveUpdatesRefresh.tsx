'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_DEBOUNCE_MS = 500;
const POLL_FALLBACK_MS = 30_000;

export function LiveUpdatesRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    let removeRealtimeChannel: (() => void) | null = null;

    const refreshLandingData = () => {
      if (!isMounted || document.visibilityState !== 'visible') {
        return;
      }

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        startTransition(() => router.refresh());
      }, REFRESH_DEBOUNCE_MS);
    };

    async function subscribeToRealtimeUpdates() {
      const { createClient } = await import('@/lib/supabase/client');
      if (!isMounted) {
        return;
      }

      const supabase = createClient();
      const channel = supabase
        .channel('landing-trust-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          refreshLandingData
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          refreshLandingData
        )
        .subscribe();

      removeRealtimeChannel = () => {
        void supabase.removeChannel(channel);
      };
    }

    void subscribeToRealtimeUpdates();
    const pollFallback = window.setInterval(refreshLandingData, POLL_FALLBACK_MS);
    document.addEventListener('visibilitychange', refreshLandingData);

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      window.clearInterval(pollFallback);
      document.removeEventListener('visibilitychange', refreshLandingData);
      removeRealtimeChannel?.();
    };
  }, [router, startTransition]);

  return null;
}
