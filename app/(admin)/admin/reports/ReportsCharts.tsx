'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface ReportsChartsProps {
  batchData: { year: string; count: number }[];
  stateData: { state: string; count: number }[];
  registrationData: { month: string; count: number }[];
  paymentData: { month: string; amount: number }[];
}

export function ReportsCharts({
  batchData,
  stateData,
  registrationData,
  paymentData,
}: ReportsChartsProps) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="font-display text-base font-semibold">Registrations Over Time</h3>
        <div className="mt-4 h-64">
          {registrationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              No registration data yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold">Alumni by Batch Year</h3>
        <div className="mt-4 h-64">
          {batchData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F2557" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              No batch data yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold">Alumni by State (Top 10)</h3>
        <div className="mt-4 h-64">
          {stateData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="state" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              No state data yet.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold">Monthly Revenue</h3>
        <div className="mt-4 h-64">
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`INR ${value.toLocaleString('en-IN')}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0F2557"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0F2557' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              No payment data yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
