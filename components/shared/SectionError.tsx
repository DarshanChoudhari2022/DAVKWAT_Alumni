import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SectionErrorProps {
  /** Short, human-readable heading for the failed region. */
  title?: string;
  /** Optional secondary line with recovery guidance. */
  message?: string;
  className?: string;
}

/**
 * Scoped, accessible error block for a single streaming region (Req 3.7).
 *
 * Server-compatible (no client hooks) so it can be rendered directly from a
 * region component's local try/catch. When a region's queries fail, render
 * this in place of the region's content instead of throwing — the page shell
 * and any already-resolved regions stay on screen.
 *
 * @example
 * async function StatsRegion() {
 *   try {
 *     const data = await loadStats();
 *     return <Stats data={data} />;
 *   } catch {
 *     return <SectionError />;
 *   }
 * }
 */
export function SectionError({
  title = "Couldn't load this section.",
  message = 'Please refresh the page to try again.',
  className,
}: SectionErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-800',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {message && <p className="mt-0.5 text-rose-700">{message}</p>}
      </div>
    </div>
  );
}
