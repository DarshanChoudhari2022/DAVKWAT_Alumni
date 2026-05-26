'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, suffix = '+', duration = 1400, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimated) return;

        setHasAnimated(true);
        const start = performance.now();

        const animate = (time: number) => {
          const progress = Math.min((time - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(value * eased));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [duration, hasAnimated, value]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString('en-IN')}{suffix}
    </span>
  );
}
