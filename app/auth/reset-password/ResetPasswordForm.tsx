'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { FieldError } from '@/components/shared/FieldError';
import {
  resetPasswordAction,
  type ResetPasswordState,
} from './actions';

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      Update password
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    const timeoutId = window.setTimeout(() => router.replace('/login'), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [router, state.success]);

  if (state.success) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
        Password updated successfully. Redirecting to login...
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="password">New Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-slate-500">Minimum 8 characters, with uppercase, lowercase, and a number</p>
        <FieldError message={state.fieldErrors?.password} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          className="mt-1.5"
        />
        <FieldError message={state.fieldErrors?.confirmPassword} />
      </div>
      <SubmitButton />
    </form>
  );
}
