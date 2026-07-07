'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { adminLoginAction, type AdminAuthState } from './actions';

export function AdminLoginForm({ redirectTo }: { redirectTo?: string }) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<AdminAuthState>({});
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    startTransition(async () => {
      const res = await adminLoginAction({}, formData);
      if (res?.error || res?.fieldErrors) {
        setState(res);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        This admin login uses local credentials from your environment, not Supabase Auth.
      </div>

      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="email">Admin Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-describedby="email-error"
          className="mt-1.5"
        />
        <FieldError id="email-error" message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-describedby="password-error"
          className="mt-1.5"
        />
        <FieldError id="password-error" message={state.fieldErrors?.password} />
      </div>

      <Button type="submit" className="w-full" loading={isPending}>
        Sign in
      </Button>
    </form>
  );
}

