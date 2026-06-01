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

/**
 * Deterministic color palette for avatar initials.
 * Alternates between the brand navy/blue and orange/amber so the directory
 * looks warm and varied rather than a wall of identical blue circles.
 */
const AVATAR_COLORS = [
  'bg-orange-100 text-orange-700',       // 0 — orange
  'bg-[#0F2557]/10 text-[#0F2557]',      // 1 — navy blue
  'bg-amber-100 text-amber-700',          // 2 — amber
  'bg-indigo-100 text-indigo-700',        // 3 — indigo
  'bg-orange-200 text-orange-800',        // 4 — deep orange
  'bg-blue-100 text-blue-700',            // 5 — sky blue
  'bg-amber-200 text-amber-800',          // 6 — deep amber
  'bg-slate-200 text-slate-700',          // 7 — neutral
] as const;

function getAvatarColor(name: string): string {
  // Use the char code of the first letter to pick a color deterministically.
  const code = name.trim().toUpperCase().charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const colorClass = getAvatarColor(name);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        colorClass,
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
