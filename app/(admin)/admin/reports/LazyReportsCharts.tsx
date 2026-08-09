'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/shared/Skeleton';

const ReportsCharts = dynamic(
  () => import('./ReportsCharts').then((module) => module.ReportsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-xl" />
        ))}
      </div>
    ),
  }
);

interface LazyReportsChartsProps {
  batchData: { year: string; count: number }[];
  stateData: { state: string; count: number }[];
  registrationData: { month: string; count: number }[];
  paymentData: { month: string; amount: number }[];
}

export function LazyReportsCharts(props: LazyReportsChartsProps) {
  return <ReportsCharts {...props} />;
}
