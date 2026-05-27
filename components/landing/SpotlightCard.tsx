'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  glowClassName?: string;
}

export function SpotlightCard({ children, className, glowClassName }: SpotlightCardProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10',
        className,
      )}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          glowClassName,
        )}
        style={{
          background: `radial-gradient(420px circle at ${position.x}% ${position.y}%, rgba(99,102,241,0.18), transparent 42%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
