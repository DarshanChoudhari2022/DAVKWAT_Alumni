'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { createClient } from '@/lib/supabase/client';

export function ResetPasswordForm({ recoveryCode }: { recoveryCode?: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPreparingSession, setIsPreparingSession] = useState(Boolean(recoveryCode));
  const [hasResetSession, setHasResetSession] = useState(Boolean(recoveryCode));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!recoveryCode) {
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: sessionError }) => {
            if (!isMounted) {
              return;
            }

            if (sessionError) {
              setError('This reset link is invalid or expired. Please request a new reset link.');
            } else {
              setHasResetSession(true);
              window.history.replaceState(null, '', '/auth/reset-password');
            }
            setIsPreparingSession(false);
          });

        return () => {
          isMounted = false;
        };
      }

      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) {
          return;
        }

        const hasSession = Boolean(data.session);
        setHasResetSession(hasSession);
        if (!hasSession) {
          setError('This reset link is invalid or expired. Please request a new reset link.');
        }
      });

      return () => {
        isMounted = false;
      };
    }

    supabase.auth.exchangeCodeForSession(recoveryCode).then(({ error: sessionError }) => {
      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setError('This reset link is invalid or expired. Please request a new reset link.');
      } else {
        setHasResetSession(true);
        router.replace('/auth/reset-password');
      }

      setIsPreparingSession(false);
    });

    return () => {
      isMounted = false;
    };
  }, [recoveryCode, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        const isMissingSession =
          updateError.message.toLowerCase().includes('session') ||
          updateError.message.toLowerCase().includes('jwt');
        setError(
          isMissingSession
            ? 'This reset session has expired. Please request a new reset link.'
            : updateError.message
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    });
  }

  if (success) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Password updated successfully! Redirecting to login…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {isPreparingSession && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Preparing your secure reset session...
        </div>
      )}
      <div>
        <Label htmlFor="password">New Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-slate-500">Min 8 characters</p>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm Password</Label>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" className="w-full" loading={isPending} disabled={isPreparingSession || !hasResetSession}>
        Update password
      </Button>
    </form>
  );
}
