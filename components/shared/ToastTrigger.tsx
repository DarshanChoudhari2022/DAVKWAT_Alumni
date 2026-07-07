'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface ToastTriggerProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function ToastTrigger({ message, type = 'success' }: ToastTriggerProps) {
  useEffect(() => {
    // Prevent duplicate toast triggers by keeping track of already shown messages
    const toastKey = `toast-${message}`;
    if (sessionStorage.getItem(toastKey)) return;
    sessionStorage.setItem(toastKey, 'true');

    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast(message);
    }
  }, [message, type]);

  return null;
}
