'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SignOutButtonProps extends Omit<ButtonProps, 'onClick' | 'type'> {
  action: () => Promise<void> | void;
}

export function SignOutButton({ action, children, ...props }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await action();
    });
  };

  return (
    <Button
      {...props}
      type="button"
      loading={isPending}
      onClick={handleSignOut}
    >
      {children}
    </Button>
  );
}
