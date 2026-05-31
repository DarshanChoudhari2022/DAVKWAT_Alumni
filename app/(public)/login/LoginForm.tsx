'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { loginAction, type AuthState } from './actions';

const initialState: AuthState = {};

interface LoginFormProps {
  redirectTo?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const isAdminLogin = redirectTo?.startsWith('/admin');

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      {isAdminLogin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Admin access uses the same sign in form.
        </div>
      )}

      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby="email-error"
          className="mt-1.5"
        />
        <FieldError id="email-error" message={state.fieldErrors?.email} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-[#0F2557]">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby="password-error"
          className="mt-1.5"
        />
        <FieldError id="password-error" message={state.fieldErrors?.password} />
      </div>

      <SubmitButton />
    </form>
  );
}
