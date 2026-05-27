import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-slate-100 bg-white p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-slate-400" />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {trend && (
        <p className="mt-1 text-xs text-slate-500">{trend}</p>
      )}
    </div>
  );
}
