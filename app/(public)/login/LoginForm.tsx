'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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

  const handleOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`,
      },
    });
  };

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

        <SubmitButton />
      </form>

      {!isAdminLogin && (
        <div className="space-y-4 pt-2">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-500 uppercase">
              Or continue with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-10 rounded-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.98 1 12 1 7.24 1 3.23 3.73 1.34 7.73l3.87 3C6.12 7.74 8.79 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58l3.77 2.92c2.2-2.03 3.68-5.01 3.68-8.67z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.21 14.27c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27L1.34 7.73C.49 9.43 0 11.31 0 13.27s.49 3.84 1.34 5.54l3.87-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.77-2.92c-1.12.75-2.54 1.2-4.19 1.2-3.21 0-5.88-2.7-6.79-5.69l-3.87 3C3.23 20.27 7.24 23 12 23z"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOAuth('linkedin_oidc')}
              className="w-full flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-10 rounded-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0077B5">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              LinkedIn
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
