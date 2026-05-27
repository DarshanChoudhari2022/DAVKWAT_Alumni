import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
} as const;

const PIXELS = { sm: 32, md: 40, lg: 56, xl: 96 } as const;

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F2557]/10 font-semibold text-[#0F2557]',
        SIZES[size],
        className
      )}
      aria-label={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={PIXELS[size]}
          height={PIXELS[size]}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </div>
  );
}
