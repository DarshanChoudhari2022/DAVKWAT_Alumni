'use client';

import { Input, type InputProps } from '@/components/ui/input';
import { INPUT_PATTERNS, VALIDATION_MESSAGES } from '@/lib/validations/constraints';

export function MobileNumberInput(props: Omit<InputProps, 'type' | 'inputMode' | 'maxLength' | 'pattern' | 'onInput'>) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={10}
      pattern={INPUT_PATTERNS.mobileNumber}
      title={VALIDATION_MESSAGES.mobileNumber}
      onInput={(event) => {
        event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
      }}
    />
  );
}
