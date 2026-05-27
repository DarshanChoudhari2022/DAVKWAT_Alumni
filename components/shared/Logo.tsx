import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function Logo({ className, variant = 'dark' }: LogoProps) {
  const text = variant === 'light' ? 'text-white' : 'text-[#0F2557]';
  const sub = variant === 'light' ? 'text-white/70' : 'text-slate-500';

  return (
    <Link href="/" className={cn('inline-flex items-center gap-2.5 group', className)} aria-label="DAVKAWT Home">
      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F2557] to-[#1a3a7a] text-white font-display font-bold shadow-sm">
        <span className="text-base leading-none">D</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('font-display text-base font-semibold tracking-tight', text)}>DAVKAWT</span>
        <span className={cn('text-[10px] uppercase tracking-wider', sub)}>Alumni Portal</span>
      </span>
    </Link>
  );
}
