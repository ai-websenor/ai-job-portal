import { Skeleton } from '@/components/ui/skeleton';
import { LineChartCard } from './LineChartCard';
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { StatCard } from './StatCard';
import { useReportQuery } from './useReportQuery';
import endpoints from '@/api/endpoints';

interface DateRangeProps {
  startDate: string;
  endDate: string;
  groupBy: string;
}

interface EmployerAnalytics {
  overTime: { period: string; count: number }[];
  byType: { type: string; count: number }[];
  byPlan: { plan: string; count: number }[];
  totals: { total: number; verified: number };
}

export function EmployersTab({ startDate, endDate, groupBy }: DateRangeProps) {
  const { data, isLoading } = useReportQuery<EmployerAnalytics>(
    ['reports', 'employerAnalytics', startDate, endDate, groupBy],
    endpoints.reports.employerAnalytics,
    { startDate, endDate, groupBy },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-admin-surface rounded-lg border border-admin-border-subtle p-5"
            >
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const timeData = data.overTime.map((r) => ({
    period: r.period,
    count: Number(r.count),
  }));

  const typeData = data.byType.map((r) => ({
    name: r.type === 'not_specified' ? 'Not Specified' : r.type || 'N/A',
    value: Number(r.count),
  }));

  const planData = data.byPlan.map((r) => ({
    name: r.plan || 'N/A',
    value: Number(r.count),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Employers" value={Number(data.totals.total).toLocaleString()} />
        <StatCard title="Verified" value={Number(data.totals.verified).toLocaleString()} />
        <StatCard
          title="Verification Rate"
          value={
            data.totals.total > 0
              ? `${((Number(data.totals.verified) / Number(data.totals.total)) * 100).toFixed(1)}%`
              : '0%'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChartCard
          title="Employer Registrations"
          subtitle="Over time"
          data={timeData}
          xKey="period"
          lines={[{ dataKey: 'count', color: 'hsl(var(--primary))', name: 'Registrations' }]}
        />
        <DonutChart title="By Company Type" subtitle="Distribution" data={typeData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          title="By Subscription Plan"
          subtitle="Current plan distribution"
          data={planData}
          barColor="hsl(var(--chart-2, 142 71% 45%))"
        />
      </div>
    </div>
  );
}
