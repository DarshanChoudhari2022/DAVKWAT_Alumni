import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

function buildHref(basePath: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  // Build a window: first, prev, current, next, last
  const pages = new Set<number>([1, page - 1, page, page + 1, totalPages]);
  const list = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-1"
    >
      <PageLink
        disabled={page === 1}
        href={buildHref(basePath, { ...searchParams, page: String(prev) })}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </PageLink>
      {list.map((p, i) => {
        const prevP = list[i - 1];
        const showGap = prevP !== undefined && p - prevP > 1;
        return (
          <span key={p} className="flex items-center">
            {showGap && <span className="px-2 text-slate-400">…</span>}
            <PageLink
              href={buildHref(basePath, { ...searchParams, page: String(p) })}
              active={p === page}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </PageLink>
          </span>
        );
      })}
      <PageLink
        disabled={page === totalPages}
        href={buildHref(basePath, { ...searchParams, page: String(next) })}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

interface PageLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function PageLink({ href, active, disabled, children, className, ...rest }: PageLinkProps) {
  const cls = cn(
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
    active
      ? 'bg-[#0F2557] text-white'
      : 'text-slate-600 hover:bg-slate-100',
    disabled && 'pointer-events-none opacity-40',
    className
  );
  if (disabled) {
    return (
      <span className={cls} aria-disabled {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
