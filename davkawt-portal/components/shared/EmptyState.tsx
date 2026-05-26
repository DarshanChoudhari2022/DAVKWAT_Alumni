import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
