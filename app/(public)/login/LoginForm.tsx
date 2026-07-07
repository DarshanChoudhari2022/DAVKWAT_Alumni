'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { loginAction, type AuthState } from './actions';

const initialState: AuthState = {};

interface LoginFormProps {
  redirectTo?: string;
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <Button type="submit" className="w-full" loading={loading}>
      Sign in
    </Button>
  );
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [state, formAction] = useActionState(async (prevState: AuthState, formData: FormData) => {
    setIsPending(true);
    try {
      const res = await loginAction(prevState, formData);
      if (res?.error || res?.fieldErrors) {
        setIsPending(false);
      }
      return res;
    } catch (err) {
      setIsPending(false);
      throw err;
    }
  }, initialState);
  const isAdminLogin = redirectTo?.startsWith('/admin');



  return (
    <div className="mt-6 space-y-4">
      <form action={formAction} className="space-y-4">
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

        <SubmitButton loading={isPending} />
      </form>


    </div>
  );
}
