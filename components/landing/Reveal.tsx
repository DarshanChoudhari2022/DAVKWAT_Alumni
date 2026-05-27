'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

type Direction = 'up' | 'left' | 'right' | 'zoom';

interface RevealProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
}

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.15,
  className,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -60px 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  const dirClass =
    direction === 'left'
      ? 'reveal-left'
      : direction === 'right'
        ? 'reveal-right'
        : direction === 'zoom'
          ? 'reveal-zoom'
          : '';

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn('reveal', dirClass, visible && 'is-visible', className)}
    >
      {children}
    </div>
  );
}
