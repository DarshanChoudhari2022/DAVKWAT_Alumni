'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { forgotPasswordAction, type ForgotState } from './actions';

const initial: ForgotState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);

  if (state.success) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        If an account exists for that email, a reset link has been sent. Check your inbox.
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <Submit />
    </form>
  );
}
